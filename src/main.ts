import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import ECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, GraphChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent
} from 'echarts/components'
import App from './App.vue'
import router from './router'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GraphChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  TitleComponent
])

const app = createApp(App)

app.component('VChart', ECharts)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
