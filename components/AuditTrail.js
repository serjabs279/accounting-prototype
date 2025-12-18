
import { defineComponent, h } from 'vue';
import { state } from '../state.js';

export default defineComponent({
  name: 'AuditTrail',
  setup() {
    return { state };
  },
  render() {
    return h('div', { class: 'bg-white rounded-[2.5rem] shadow-sm border overflow-hidden' }, [
      h('div', { class: 'p-8 border-b' }, [
        h('h3', { class: 'text-xl font-black' }, 'System Security Logs'),
        h('p', { class: 'text-xs text-slate-400 font-bold mt-1' }, 'Live activity monitoring for error prevention and fraud detection.')
      ]),
      h('div', { class: 'p-0' }, [
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'bg-slate-50 text-[10px] font-black text-slate-500 uppercase' }, [
            h('tr', [
              h('th', { class: 'px-8 py-4' }, 'Timestamp'),
              h('th', { class: 'px-8 py-4' }, 'User'),
              h('th', { class: 'px-8 py-4' }, 'Module'),
              h('th', { class: 'px-8 py-4' }, 'Action Description')
            ])
          ]),
          h('tbody', { class: 'divide-y' }, this.state.auditLogs.map(log => 
            h('tr', { class: 'hover:bg-slate-50' }, [
              h('td', { class: 'px-8 py-4 text-xs font-medium text-slate-500' }, log.timestamp),
              h('td', { class: 'px-8 py-4 font-bold text-sm' }, log.user),
              h('td', { class: 'px-8 py-4' }, [
                h('span', { class: 'px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black uppercase text-slate-600' }, log.module)
              ]),
              h('td', { class: 'px-8 py-4 text-sm text-slate-600' }, log.action)
            ])
          ))
        ]),
        this.state.auditLogs.length === 0 ? h('div', { class: 'p-20 text-center text-slate-300 italic' }, 'No activity recorded yet.') : null
      ])
    ]);
  }
});
