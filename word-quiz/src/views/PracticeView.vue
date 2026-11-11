<script setup>
import { computed, nextTick, onActivated, onMounted, reactive, ref, watch } from 'vue'
import wordsData from '../data/words.json'
import {
  MODES,
  TYPE_LABELS,
  buildDeck,
  correctAnswer,
  createQuestion,
  createWordIndex,
  getAcceptedWords,
  gradeQuestion,
  normalizeEn,
  shuffle
} from '../lib/quiz'
import { recordAttempt, setMode, store } from '../lib/store'
import { notify } from '../lib/toast'

const emit = defineEmits(['navigate'])
const props = defineProps({
  wrongRequest: { type: Object, default: null }
})

const words = wordsData.words
const index = createWordIndex(words)

const mode = ref(store.settings.mode || 'mix')
const deck = ref([])
const deckCursor = ref(0)
const current = ref(null)
const answer = ref('')
const selected = ref('')
const revealed = ref(false)
const result = ref(null)
const formError = ref('')

const session = reactive({ answered: 0, correct: 0, streak: 0 })

const wrongMode = ref(false)
const wrongQueue = ref([])
const wrongCursor = ref(0)
const wrongFinished = ref(false)

const inputEl = ref(null)
const nextEl = ref(null)

const isCloze = computed(() => current.value?.type === 'cloze')
const typeLabel = computed(() => (current.value ? TYPE_LABELS[current.value.type] : ''))
const sessionAccuracy = computed(() =>
  session.answered ? Math.round((session.correct / session.answered) * 100) : null
)

const progress = computed(() => {
  if (wrongMode.value) {
    return {
      current: Math.min(wrongCursor.value + 1, wrongQueue.value.length),
      total: wrongQueue.value.length
    }
  }
  return {
    current: Math.min(deckCursor.value + 1, deck.value.length),
    total: deck.value.length
  }
})

const alternates = computed(() => {
  if (!current.value || current.value.type !== 'zh2en') return []
  const target = normalizeEn(current.value.word.word)
  return getAcceptedWords(current.value.word, index).filter((word) => normalizeEn(word) !== target)
})

const remainingWrong = computed(() => {
  const valid = new Set(store.wrong.map((item) => item.key))
  return wrongQueue.value.filter((item) => valid.has(item.key)).map((item) => item.key)
})

const inputPlaceholder = computed(() =>
  current.value?.type === 'en2zh' ? '输入中文释义，答对任一义项即可' : '输入英文单词'
)

function focusInput() {
  if (typeof window === 'undefined' || !window.matchMedia) return
  if (!window.matchMedia('(pointer: fine)').matches) return
  nextTick(() => inputEl.value?.focus())
}

function resetSession() {
  session.answered = 0
  session.correct = 0
  session.streak = 0
}

function resetAnswer() {
  answer.value = ''
  selected.value = ''
  revealed.value = false
  result.value = null
  formError.value = ''
}

function startFreshDeck() {
  deck.value = buildDeck(words, mode.value)
  deckCursor.value = 0
}

function findWord(entry) {
  return (
    words.find((item) => item.id === entry.wordId) ||
    words.find((item) => normalizeEn(item.word) === normalizeEn(entry.word))
  )
}

function drawQuestion() {
  resetAnswer()

  if (wrongMode.value) {
    if (wrongCursor.value >= wrongQueue.value.length) {
      finishWrong()
      return
    }

    const entry = wrongQueue.value[wrongCursor.value]
    const word = findWord(entry)
    if (!word) {
      wrongCursor.value += 1
      drawQuestion()
      return
    }

    current.value = createQuestion({ word, type: entry.type }, words, index)
    focusInput()
    return
  }

  if (!deck.value.length) startFreshDeck()
  if (deckCursor.value >= deck.value.length) {
    startFreshDeck()
    notify('已完成一轮，重新洗牌')
  }

  current.value = createQuestion(deck.value[deckCursor.value], words, index)
  focusInput()
}

function changeMode(nextMode) {
  if (wrongMode.value || nextMode === mode.value) return
  mode.value = nextMode
  setMode(nextMode)
  current.value = null
  wrongFinished.value = false
  resetSession()
  resetAnswer()
  startFreshDeck()
  drawQuestion()
}

function startWrong(keys) {
  const wanted = new Set(keys)
  const entries = store.wrong.filter((item) => wanted.has(item.key))
  if (!entries.length) {
    notify('没有可重练的错题', 'bad')
    return
  }

  wrongMode.value = true
  wrongFinished.value = false
  wrongQueue.value = shuffle(entries)
  wrongCursor.value = 0
  current.value = null
  resetSession()
  resetAnswer()
  drawQuestion()
}

function exitWrong() {
  wrongMode.value = false
  wrongFinished.value = false
  wrongQueue.value = []
  wrongCursor.value = 0
  current.value = null
  resetSession()
  resetAnswer()
  startFreshDeck()
  drawQuestion()
}

function finishWrong() {
  wrongFinished.value = true
  current.value = null
  resetAnswer()
  if (!store.wrong.length) notify('错题本已清空', 'ok')
  else notify('本轮错题已练完', 'ok')
}

function restartWrong() {
  const keys = remainingWrong.value
  if (!keys.length) {
    exitWrong()
    return
  }
  startWrong(keys)
}

function next() {
  if (wrongMode.value) {
    if (wrongCursor.value + 1 >= wrongQueue.value.length) {
      wrongCursor.value = wrongQueue.value.length
      finishWrong()
      return
    }
    wrongCursor.value += 1
    drawQuestion()
    return
  }

  deckCursor.value += 1
  if (deckCursor.value >= deck.value.length) {
    startFreshDeck()
    notify('已完成一轮，重新洗牌')
  }
  drawQuestion()
}

function skip() {
  if (wrongMode.value || revealed.value) return
  deckCursor.value += 1
  if (deckCursor.value >= deck.value.length) {
    startFreshDeck()
    notify('已完成一轮，重新洗牌')
  }
  drawQuestion()
}

function submit() {
  if (!current.value || revealed.value) return

  let value = ''
  if (isCloze.value) {
    value = selected.value
    if (!value) {
      formError.value = '请先选择一个选项'
      return
    }
  } else {
    value = answer.value.trim()
    if (!value) {
      formError.value = '请先填写答案'
      inputEl.value?.focus()
      return
    }
  }

  const graded = gradeQuestion(current.value, value, index)
  const { wrongChange } = recordAttempt({
    word: current.value.word,
    type: current.value.type,
    input: value,
    correct: graded.correct,
    answer: correctAnswer(current.value)
  })

  revealed.value = true
  result.value = { ...graded, wrongChange }
  formError.value = ''

  session.answered += 1
  if (graded.correct) {
    session.correct += 1
    session.streak += 1
  } else {
    session.streak = 0
  }

  if (!graded.correct) {
    notify(wrongChange === 'updated' ? '错题次数已更新' : '已加入错题本', 'bad')
  } else if (wrongChange === 'removed') {
    notify('回答正确，已移出错题本', 'ok')
  } else if (session.streak === 3 || session.streak % 5 === 0) {
    notify(`连对 ${session.streak} 题`, 'ok')
  }

  nextTick(() => nextEl.value?.focus())
}

function selectOption(option) {
  if (revealed.value) return
  selected.value = option
  formError.value = ''
}

function optionClass(option) {
  if (!revealed.value) return selected.value === option ? 'selected' : ''
  if (option === current.value?.word.word) return 'correct'
  if (option === selected.value) return 'wrong'
  return 'dim'
}

watch(
  () => props.wrongRequest,
  (request) => {
    if (request?.id && Array.isArray(request.keys)) startWrong(request.keys)
  }
)

onMounted(() => {
  if (props.wrongRequest?.keys?.length) {
    startWrong(props.wrongRequest.keys)
  } else {
    startFreshDeck()
    drawQuestion()
  }
})

onActivated(() => {
  if (current.value && !revealed.value && !isCloze.value) focusInput()
})
</script>

<template>
  <div class="practice-view">
    <div class="page-head">
      <div>
        <h1>单词练习</h1>
        <p>从 word.md 的 500 条词库中随机抽题，每轮重新洗牌。</p>
      </div>
      <span v-if="wrongMode" class="wrong-pill">错题重练中</span>
    </div>

    <div v-if="wrongMode" class="wrong-banner">
      <div>
        <strong>错题重练</strong>
        <span>答对后自动移出错题本，答错会更新记录。</span>
      </div>
      <button class="link-btn" type="button" @click="exitWrong">退出重练</button>
    </div>

    <div v-else class="mode-tabs" role="tablist" aria-label="选择题型">
      <button
        v-for="item in MODES"
        :key="item.value"
        class="mode-tab"
        :class="{ active: mode === item.value }"
        type="button"
        role="tab"
        :aria-selected="mode === item.value"
        @click="changeMode(item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="session-bar card" aria-label="本轮练习数据">
      <div class="session-item">
        <span class="k">本轮进度</span>
        <strong>{{ progress.current }}<small> / {{ progress.total }}</small></strong>
      </div>
      <div class="session-item">
        <span class="k">正确 / 已答</span>
        <strong>{{ session.correct }}<small> / {{ session.answered }}</small></strong>
      </div>
      <div class="session-item">
        <span class="k">正确率</span>
        <strong>{{ sessionAccuracy === null ? '—' : `${sessionAccuracy}%` }}</strong>
      </div>
      <div class="session-item">
        <span class="k">连对</span>
        <strong>{{ session.streak }}</strong>
      </div>
      <button v-if="!wrongMode" class="btn btn-ghost btn-small session-skip" type="button" @click="skip">
        换一题
      </button>
    </div>

    <section v-if="current" class="question-card card">
      <div class="q-head">
        <span class="badge">{{ typeLabel }}</span>
        <span class="q-meta">{{ wrongMode ? '来自错题本' : `${mode === 'mix' ? '随机混合' : '专项练习'}` }}</span>
      </div>

      <div class="prompt">
        <template v-if="current.type === 'en2zh'">
          <div class="word">{{ current.word.word }}</div>
          <div class="phonetic">{{ current.word.phonetics.join(' · ') }}</div>
          <p class="prompt-hint">写出它的中文释义</p>
        </template>

        <template v-else>
          <div class="meaning" :class="{ compact: current.type === 'cloze' }">
            {{ current.word.promptMeaning }}
          </div>
          <template v-if="current.type === 'zh2en'">
            <p class="prompt-hint">写出对应的英文单词</p>
          </template>
          <template v-else>
            <div class="blank" aria-hidden="true"></div>
            <p class="prompt-hint">根据释义，选择可以填入空白的单词</p>
          </template>
        </template>
      </div>

      <div v-if="isCloze" class="options" role="group" aria-label="选项">
        <button
          v-for="(option, i) in current.options"
          :key="option"
          class="option"
          :class="optionClass(option)"
          type="button"
          :disabled="revealed"
          @click="selectOption(option)"
        >
          <span class="option-letter">{{ 'ABCD'[i] }}</span>
          <span class="option-word">{{ option }}</span>
        </button>
      </div>

      <form v-else class="answer-form" @submit.prevent="submit">
        <label class="sr-only" for="answer-input">输入答案</label>
        <input
          id="answer-input"
          ref="inputEl"
          v-model="answer"
          class="answer-input"
          type="text"
          :placeholder="inputPlaceholder"
          :disabled="revealed"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          @input="formError = ''"
        />
        <button class="btn btn-primary submit-btn" type="submit" :disabled="revealed || !answer.trim()">
          提交
        </button>
      </form>

      <div v-if="isCloze && !revealed" class="submit-row">
        <button class="btn btn-primary submit-btn" type="button" :disabled="!selected" @click="submit">
          提交答案
        </button>
      </div>

      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

      <div v-if="revealed && result" class="result" :class="result.correct ? 'result-ok' : 'result-bad'">
        <div class="result-head">
          <span class="result-icon" aria-hidden="true">{{ result.correct ? '✓' : '×' }}</span>
          <div>
            <strong>{{ result.correct ? '回答正确' : '回答错误' }}</strong>
            <p v-if="!result.correct">
              {{ result.wrongChange === 'updated' ? '错题次数已更新' : '已自动加入错题本' }}
            </p>
            <p v-else-if="result.wrongChange === 'removed'">已从错题本移除</p>
          </div>
        </div>

        <div class="answer-reveal">
          <template v-if="current.type === 'en2zh'">
            <span class="reveal-label">参考释义</span>
            <p class="reveal-main">{{ current.word.meaning }}</p>
          </template>
          <template v-else>
            <span class="reveal-label">正确单词</span>
            <p class="reveal-main reveal-word">{{ current.word.word }}</p>
            <p class="reveal-sub">
              {{ current.word.phonetics.join(' · ') }} · {{ current.word.meaning }}
            </p>
            <p v-if="alternates.length" class="reveal-sub">
              同义词组：{{ alternates.join(' / ') }}
            </p>
          </template>

          <p class="given">
            你的答案：{{ result.given || '（空）' }}
            <span v-if="result.alternative" class="alternative-note">（同义词组内答案，同样正确）</span>
          </p>
        </div>

        <button ref="nextEl" class="btn btn-primary next-btn" type="button" @click="next">
          {{ wrongMode && wrongCursor + 1 >= wrongQueue.length ? '完成重练' : '下一题' }}
        </button>
      </div>

      <div v-else class="card-actions">
        <button v-if="!wrongMode" class="btn btn-ghost btn-small" type="button" @click="skip">
          随机换一题
        </button>
        <span class="key-tip">{{ isCloze ? '选择后提交' : 'Enter 提交' }}</span>
      </div>
    </section>

    <section v-else-if="wrongFinished" class="finish-card card">
      <div class="finish-mark" aria-hidden="true">✓</div>
      <h2>本轮错题已练完</h2>
      <p>
        本轮答对 {{ session.correct }} / {{ session.answered }} 题。
        <template v-if="store.wrong.length">错题本还剩 {{ store.wrong.length }} 题。</template>
        <template v-else>错题本已清空。</template>
      </p>
      <div class="finish-actions">
        <button v-if="remainingWrong.length" class="btn btn-primary" type="button" @click="restartWrong">
          再练剩余 {{ remainingWrong.length }} 题
        </button>
        <button class="btn btn-ghost" type="button" @click="emit('navigate', 'wrong')">返回错题本</button>
        <button class="btn btn-ghost" type="button" @click="exitWrong">普通练习</button>
      </div>
    </section>

    <p class="judge-note">
      判分说明：英译汉答对任一义项即可；汉译英接受词库内同义词组答案；英文拼写不区分大小写。
    </p>
  </div>
</template>

<style scoped>
.practice-view {
  width: min(780px, 100%);
  margin: 0 auto;
}

.wrong-pill {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 12px;
  font-weight: 650;
}

.mode-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 10px 28px rgba(33, 55, 78, 0.04);
}

.mode-tab {
  min-height: 38px;
  padding: 0 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  transition: background 0.16s ease, color 0.16s ease;
}

.mode-tab:hover {
  background: var(--brand-tint);
  color: var(--brand);
}

.mode-tab.active {
  background: var(--brand-soft);
  color: var(--brand-deep);
  font-weight: 650;
}

.wrong-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid #eadfcd;
  border-radius: 12px;
  background: var(--warn-soft);
}

.wrong-banner div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.wrong-banner strong {
  color: #7d5c32;
  font-size: 13.5px;
}

.wrong-banner span {
  color: #94764e;
  font-size: 12px;
}

.session-bar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
  align-items: center;
  gap: 10px;
  margin: 14px 0 16px;
  padding: 13px 18px;
  box-shadow: none;
}

.session-item {
  min-width: 0;
}

.session-item .k {
  display: block;
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.04em;
}

.session-item strong {
  display: block;
  margin-top: 1px;
  color: var(--ink);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  line-height: 1.35;
}

.session-item small {
  color: var(--muted);
  font-size: 11px;
  font-weight: 400;
}

.session-skip {
  white-space: nowrap;
}

.question-card {
  padding: 28px 34px 24px;
  min-height: 430px;
  display: flex;
  flex-direction: column;
}

.q-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 7px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11.5px;
  font-weight: 650;
}

.q-meta {
  color: var(--muted);
  font-size: 11.5px;
}

.prompt {
  flex: 1;
  padding: 36px 0 30px;
  text-align: center;
}

.word {
  color: var(--brand-deep);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(38px, 6vw, 54px);
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.phonetic {
  margin-top: 9px;
  color: var(--muted);
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 15px;
  letter-spacing: 0.01em;
}

.meaning {
  max-width: 600px;
  margin: 0 auto;
  color: var(--ink);
  font-size: 23px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.55;
}

.meaning.compact {
  font-size: 21px;
}

.prompt-hint {
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 12.5px;
}

.blank {
  width: 150px;
  height: 2px;
  margin: 20px auto 0;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, #c3d3e3 12%, #c3d3e3 88%, transparent);
}

.answer-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.answer-input {
  width: 100%;
  min-height: 50px;
  padding: 0 16px;
  border: 1.5px solid var(--line);
  border-radius: 11px;
  background: var(--surface-2);
  color: var(--ink);
  font-size: 16px;
  transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease;
}

.answer-input::placeholder {
  color: #a1aebb;
}

.answer-input:focus {
  outline: none;
  border-color: var(--brand);
  background: var(--surface);
  box-shadow: 0 0 0 4px rgba(53, 87, 124, 0.08);
}

.answer-form .btn {
  min-width: 92px;
}

.options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.option {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 54px;
  padding: 10px 14px;
  border: 1.5px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink-2);
  text-align: left;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease, opacity 0.16s ease;
}

.option:hover:not(:disabled) {
  border-color: #c5d4e3;
  background: var(--brand-tint);
}

.option-letter {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--brand-soft);
  color: var(--brand);
  font-size: 11px;
  font-weight: 700;
}

.option-word {
  overflow-wrap: anywhere;
  font-size: 15px;
  font-weight: 600;
}

.option.selected {
  border-color: var(--brand);
  background: var(--brand-soft);
  color: var(--brand-deep);
}

.option.correct {
  border-color: #a9cdb9;
  background: var(--ok-soft);
  color: #35624d;
}

.option.correct .option-letter {
  background: #d9ebdf;
  color: var(--ok);
}

.option.wrong {
  border-color: #dfb6b0;
  background: var(--bad-soft);
  color: #8d4f47;
}

.option.wrong .option-letter {
  background: #f3dcda;
  color: var(--bad);
}

.option.dim {
  opacity: 0.55;
}

.submit-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.form-error {
  margin: 9px 0 0;
  color: var(--bad);
  font-size: 12.5px;
}

.result {
  margin-top: 18px;
  padding: 16px 18px;
  border: 1px solid;
  border-radius: 12px;
}

.result-ok {
  border-color: var(--ok-line);
  background: var(--ok-soft);
}

.result-bad {
  border-color: var(--bad-line);
  background: var(--bad-soft);
}

.result-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.result-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 29px;
  height: 29px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.72);
  font-size: 15px;
  font-weight: 700;
}

.result-ok .result-icon {
  color: var(--ok);
}

.result-bad .result-icon {
  color: var(--bad);
}

.result-head strong {
  font-size: 14.5px;
}

.result-ok .result-head strong {
  color: #35624d;
}

.result-bad .result-head strong {
  color: #8d4f47;
}

.result-head p {
  margin: 0;
  color: var(--bad);
  font-size: 11.5px;
}

.result-ok .result-head p {
  color: var(--ok);
}

.answer-reveal {
  margin-top: 13px;
  padding-top: 13px;
  border-top: 1px dashed rgba(53, 87, 124, 0.14);
}

.reveal-label {
  display: block;
  color: var(--muted);
  font-size: 10.5px;
  letter-spacing: 0.06em;
}

.reveal-main {
  margin: 3px 0 0;
  color: var(--ink);
  font-size: 18px;
  font-weight: 650;
  line-height: 1.5;
}

.reveal-word {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 25px;
  font-weight: 600;
}

.reveal-sub {
  margin: 4px 0 0;
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.65;
}

.given {
  margin: 12px 0 0;
  color: var(--ink-2);
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

.alternative-note {
  color: var(--ok);
}

.next-btn {
  width: 100%;
  margin-top: 14px;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
}

.key-tip {
  color: var(--muted);
  font-size: 11.5px;
}

.finish-card {
  padding: 50px 30px;
  text-align: center;
}

.finish-mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--ok-soft);
  color: var(--ok);
  font-size: 25px;
  font-weight: 700;
}

.finish-card h2 {
  margin: 0;
  font-size: 21px;
  letter-spacing: -0.01em;
}

.finish-card p {
  margin: 8px auto 22px;
  max-width: 440px;
  color: var(--muted);
  font-size: 13.5px;
}

.finish-actions {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px;
}

.judge-note {
  margin: 18px 2px 0;
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.7;
  text-align: center;
}

@media (max-width: 720px) {
  .practice-view {
    width: 100%;
  }

  .mode-tabs {
    border-radius: 11px;
  }

  .mode-tab {
    min-height: 37px;
    padding: 0 2px;
    font-size: 12px;
  }

  .session-bar {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
    padding: 11px 13px;
  }

  .session-item .k {
    font-size: 9.5px;
  }

  .session-item strong {
    font-size: 15.5px;
  }

  .session-skip {
    grid-column: 1 / -1;
    min-height: 32px;
  }

  .question-card {
    padding: 20px 17px 18px;
    min-height: 390px;
  }

  .prompt {
    padding: 28px 0 24px;
  }

  .word {
    font-size: 40px;
  }

  .meaning {
    font-size: 20px;
  }

  .meaning.compact {
    font-size: 18.5px;
  }

  .options {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .option {
    min-height: 50px;
  }

  .answer-form {
    grid-template-columns: minmax(0, 1fr) 84px;
    gap: 8px;
  }

  .answer-input {
    min-height: 48px;
    padding: 0 13px;
    font-size: 16px;
  }

  .result {
    padding: 14px 14px;
  }

  .finish-card {
    padding: 40px 20px;
  }

  .finish-actions {
    flex-direction: column;
  }

  .finish-actions .btn {
    width: 100%;
  }

  .wrong-banner {
    align-items: flex-start;
  }

  .wrong-banner div {
    gap: 3px;
  }
}
</style>
