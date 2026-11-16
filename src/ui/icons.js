import { createElement } from 'react'

// Original IriAegis glyphs: register, timetable and identity card on a 24px grid.
// Keep this API stable for product screens, camera and the component examples.
const glyphs = {
  ArrowRight: ['M4 12h15m-5-5 5 5-5 5'],
  ArrowLeft: ['M20 12H5m5-5-5 5 5 5'],
  ArrowUpRight: ['M6 18 18 6M7 6h11v11'],
  ChevronRight: ['m9 5 7 7-7 7'],
  BookOpen: ['M6 3h13v18H6V3Zm-3 4h5m-5 5h5m-5 5h5M11 8h5m-5 4h5'],
  CalendarCheck: ['M4 4h12v16H4V4Zm4 4h4M8 12h3m4 4 2 2 4-5'],
  CalendarDays: ['M4 5h16v16H4V5Zm4-3v5m8-5v5M4 10h16M8 14h1m6 0h1m-8 4h1m6 0h1'],
  ClipboardList: ['M5 3h14v18H5V3Zm3 14v-3m4 3V9m4 8v-6M8 6h8'],
  Database: ['M3 7h18v4H3V7Zm2 4v10h14V11M9 15h6M7 3h10v4'],
  Home: ['M3 7h18v14H3V7Zm4-4v5m10-5v5M3 11h18M7 15h3v3H7v-3Zm8 0h2m-2 3h2'],
  LogOut: ['M10 4H4v16h6m-2-8h13m-4-4 4 4-4 4'],
  Mail: ['M3 5h18v14H3V5Zm0 1 9 7 9-7'],
  Settings2: ['M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-7 0v6'],
  ShieldCheck: ['M3 5h18v15H3V5Zm5 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5 17c0-2 6-2 6 0m3-7h4m-4 4h4'],
  UserCircle: ['M8 9a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-2c0-5 16-5 16 0v2'],
  Users: ['M3 3h18v18H3V3Zm4 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm-2 7h4m4-6h5m-5 5h5M6 18h12'],
  UserCheck: ['M4 8a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM2 21v-2c0-4 12-4 12 0v2m1-9 2 2 5-6'],
  MoreHorizontal: ['M4 6h16M4 12h16M4 18h16'],
  Camera: ['M3 7h5l2-3h4l2 3h5v13H3V7Zm5 6a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z'],
  CameraOff: ['m3 3 18 18M8 7l2-3h4l2 3h5v10M5 7H3v13h14m-8-9a4 4 0 0 0 5 5'],
  Check: ['m4 12 5 5L20 6'],
  RefreshCcw: ['M20 9a8 8 0 0 0-14-4L3 8m0-5v5h5m-4 7a8 8 0 0 0 14 4l3-3m0 5v-5h-5'],
  RotateCcw: ['M4 8a8 8 0 1 1 0 8M4 3v5h5'],
  X: ['m6 6 12 12M6 18 18 6'],
  Download: ['M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5'],
  FileUp: ['M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5'],
  Edit2: ['m4 16 12-12 4 4L8 20H4v-4Zm9-9 4 4'],
  Plus: ['M12 4v16M4 12h16'],
  Search: ['M3 10a7 7 0 1 0 14 0 7 7 0 0 0-14 0Zm12 5 6 6'],
  Trash2: ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'],
  Save: ['M4 3h13l3 3v15H4V3Zm4 0v7h8V3M8 21v-7h8v7'],
  Send: ['m3 3 19 9-19 9 3-9-3-9Zm3 9h16'],
  AlertCircle: ['m12 3 10 18H2L12 3Zm0 6v5m0 3v1'],
  CheckCircle2: ['M21 12a9 9 0 1 1-5-8M8 11l4 4 9-10'],
  Info: ['M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Zm9-1v6m0-10v1'],
  LoaderCircle: ['M21 12a9 9 0 1 1-9-9'],
  Layers: ['m12 3 10 5-10 5L2 8l10-5Zm-9 10 9 5 9-5M3 18l9 5 9-5'],
  Palette: ['M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4c-2 0-2-3 0-3h4c5 0 4-11-5-11ZM7 9h.1M11 6h.1M16 8h.1M6 14h.1'],
}
function makeIcon(name) {
  function Icon({ size = 20, weight = 'regular', strokeWidth, ...props }) {
    return createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: strokeWidth || (weight === 'fill' ? 2.2 : 1.7), strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': props['aria-label'] ? undefined : true, focusable: false, 'data-icon': name, ...props },
      glyphs[name].map((d, index) => createElement('path', { d, key: index })))
  }
  Icon.displayName = name
  return Icon
}
export const ArrowRight = makeIcon('ArrowRight'), ArrowLeft = makeIcon('ArrowLeft'), ArrowUpRight = makeIcon('ArrowUpRight'), ChevronRight = makeIcon('ChevronRight')
export const BookOpen = makeIcon('BookOpen'), CalendarCheck = makeIcon('CalendarCheck'), CalendarDays = makeIcon('CalendarDays'), ClipboardList = makeIcon('ClipboardList')
export const Database = makeIcon('Database'), Home = makeIcon('Home'), LogOut = makeIcon('LogOut'), Mail = makeIcon('Mail'), Settings2 = makeIcon('Settings2')
export const ShieldCheck = makeIcon('ShieldCheck'), UserCircle = makeIcon('UserCircle'), Users = makeIcon('Users'), UserCheck = makeIcon('UserCheck'), MoreHorizontal = makeIcon('MoreHorizontal')
export const Camera = makeIcon('Camera'), CameraOff = makeIcon('CameraOff'), Check = makeIcon('Check'), RefreshCcw = makeIcon('RefreshCcw'), RotateCcw = makeIcon('RotateCcw'), X = makeIcon('X')
export const Download = makeIcon('Download'), FileUp = makeIcon('FileUp'), Edit2 = makeIcon('Edit2'), Pencil = Edit2, Plus = makeIcon('Plus'), Search = makeIcon('Search'), Trash2 = makeIcon('Trash2')
export const Save = makeIcon('Save'), Send = makeIcon('Send'), AlertCircle = makeIcon('AlertCircle'), CheckCircle2 = makeIcon('CheckCircle2'), Info = makeIcon('Info'), LoaderCircle = makeIcon('LoaderCircle'), Layers = makeIcon('Layers'), Palette = makeIcon('Palette')