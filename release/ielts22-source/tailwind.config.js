/** @type {import('tailwindcss').Config} */
module.exports = {
  // 扫描所有含 class 的文件；app.js 里的视图模板也在这里
  content: ['./index.html', './app.js'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 低饱和深蓝灰
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#dde1e7',
          300: '#c3cad4',
          400: '#8d99a8',
          500: '#66748a',
          600: '#4d5b70',
          700: '#3a4658',
          800: '#2a3442',
          900: '#1d2530',
          950: '#121821'
        },
        // 低饱和深蓝主色
        brand: {
          50: '#f0f4f9',
          100: '#dde7f2',
          200: '#c0d3e6',
          300: '#94b4d3',
          400: '#648fb9',
          500: '#456f9c',
          600: '#35577c',
          700: '#2c4664',
          800: '#283c54',
          900: '#253448'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
        serif: ['Georgia', 'Iowan Old Style', 'Songti SC', 'SimSun', 'serif']
      }
    }
  },
  plugins: []
};
