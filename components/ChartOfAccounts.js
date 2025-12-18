
import { defineComponent, h, reactive } from 'vue';
import { state, useAccounting } from '../state.js';
import { AccountType } from '../constants.js';

export default defineComponent({
  name: 'ChartOfAccounts',
  setup() {
    const { getAccountBalance } = useAccounting();
    const newAcc = reactive({
      showModal: false,
      code: '',
      name: '',
      type: AccountType.ASSET,
      description: ''
    });

    const addAccount = () => {
      state.accounts.push({
        id: Date.now().toString(),
        code: newAcc.code,
        name: newAcc.name,
        type: newAcc.type,
        description: newAcc.description,
        initialBalance: 0
      });
      newAcc.showModal = false;
      newAcc.code = '';
      newAcc.name = '';
      newAcc.description = '';
    };

    return { state, newAcc, addAccount, getAccountBalance };
  },
  render() {
    return h('div', { class: 'bg-white rounded-[2.5rem] shadow-sm border border-emerald-50 overflow-hidden' }, [
      h('div', { class: 'p-10 border-b border-emerald-50 flex justify-between items-center' }, [
        h('h3', { class: 'text-xl font-black text-slate-800' }, 'Institutional Chart of Accounts'),
        h('button', { 
          onClick: () => this.newAcc.showModal = true,
          class: 'green-gradient text-white px-8 py-3 rounded-2xl text-xs font-black shadow-lg shadow-emerald-100' 
        }, '+ NEW ACCOUNT CODE')
      ]),
      h('table', { class: 'w-full text-left' }, [
        h('thead', { class: 'bg-emerald-50/20 text-slate-400 text-[10px] font-black uppercase tracking-widest' }, [
          h('tr', [
            h('th', { class: 'px-10 py-6' }, 'Account Code'),
            h('th', { class: 'px-10 py-6' }, 'Account Name'),
            h('th', { class: 'px-10 py-6' }, 'Type'),
            h('th', { class: 'px-10 py-6 text-right' }, 'Balance')
          ])
        ]),
        h('tbody', { class: 'divide-y divide-emerald-50/50' }, this.state.accounts.map(acc => 
          h('tr', { class: 'hover:bg-emerald-50/10' }, [
            h('td', { class: 'px-10 py-6 font-mono font-bold text-emerald-600 text-sm' }, acc.code),
            h('td', { class: 'px-10 py-6 font-bold text-slate-800 text-sm' }, acc.name),
            h('td', { class: 'px-10 py-6' }, [
              h('span', { 
                class: `px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight ${
                  acc.type === AccountType.ASSET ? 'bg-emerald-50 text-emerald-700' :
                  acc.type === AccountType.LIABILITY ? 'bg-rose-50 text-rose-700' :
                  acc.type === AccountType.REVENUE ? 'bg-emerald-50 text-emerald-700' :
                  'bg-rose-50 text-rose-700'
                }`
              }, acc.type)
            ]),
            h('td', { class: 'px-10 py-6 text-right font-black text-slate-900 text-sm' }, `₱${this.getAccountBalance(acc.id).toLocaleString()}`)
          ])
        ))
      ]),

      this.newAcc.showModal ? h('div', { class: 'fixed inset-0 bg-slate-800/50 flex items-center justify-center z-50 p-8' }, [
        h('div', { class: 'bg-white p-12 rounded-[3rem] w-full max-w-lg shadow-2xl border border-emerald-100 animate-fade relative' }, [
          h('button', { onClick: () => this.newAcc.showModal = false, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-2xl font-black mb-10 text-slate-800' }, 'Define Account Code'),
          h('div', { class: 'space-y-6' }, [
            h('div', [
              h('label', { class: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2' }, 'Account Code'),
              h('input', { 
                value: this.newAcc.code, 
                onInput: e => this.newAcc.code = e.target.value,
                placeholder: 'e.g. 1001',
                class: 'w-full p-4 bg-emerald-50/30 border-none rounded-2xl outline-none font-bold text-sm' 
              })
            ]),
            h('div', [
              h('label', { class: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2' }, 'Category'),
              h('select', { 
                value: this.newAcc.type,
                onChange: e => this.newAcc.type = e.target.value,
                class: 'w-full p-4 bg-emerald-50/30 border-none rounded-2xl outline-none font-bold text-sm'
              }, Object.values(AccountType).map(t => h('option', { value: t }, t)))
            ]),
            h('div', [
              h('label', { class: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2' }, 'Account Display Name'),
              h('input', { 
                value: this.newAcc.name, 
                onInput: e => this.newAcc.name = e.target.value,
                placeholder: 'e.g. Science Fund',
                class: 'w-full p-4 bg-emerald-50/30 border-none rounded-2xl outline-none font-bold text-sm' 
              })
            ]),
            h('div', { class: 'flex gap-4 pt-6' }, [
              h('button', { onClick: () => this.newAcc.showModal = false, class: 'flex-1 p-5 bg-red-600 text-white rounded-2xl font-black' }, 'DISCARD'),
              h('button', { onClick: this.addAccount, class: 'flex-1 p-5 green-gradient text-white rounded-2xl font-black' }, 'SAVE ACCOUNT')
            ])
          ])
        ])
      ]) : null
    ]);
  }
});
