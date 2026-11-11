import { reactive } from 'vue'

export const toast = reactive({
  id: 0,
  message: '',
  tone: 'info'
})

let timer = null

export function notify(message, tone = 'info') {
  toast.message = message
  toast.tone = tone
  toast.id += 1
  clearTimeout(timer)
  timer = setTimeout(() => {
    toast.message = ''
  }, 2600)
}
