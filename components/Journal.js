
import { defineComponent, h, reactive, computed } from 'vue';
import { state, logAction } from '../state.js';

export default defineComponent({
  name: 'Journal',
  setup() {
    const newEntry = reactive({
      showModal: false,
      date: new Date().toISOString().split('T')[0],
      reference: '',
      description: '',
      lines: [
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 }
      ]
    });

    const totals = computed(() => {
      return newEntry.lines.reduce((acc, line) => {
        acc.debit += (Number(line.debit) || 0);
        acc.credit += (Number(line.credit) || 0);
        return acc;
      }, { debit: 0, credit: 0 });
    });

    const isBalanced = computed(() => {
      const d = Number(totals.value.debit);
      const c = Number(totals.value.credit);
      const hasAccounts = newEntry.lines.every(l => l.accountId !== '');
      const hasValues = d > 0;
      return hasAccounts && hasValues && Math.abs(d - c) < 0.01;
    });

    const balanceDifference = computed(() => {
      return Math.abs(Number(totals.value.debit) - Number(totals.value.credit));
    });

    const addEntry = () => {
      if (!isBalanced.value) return;
      
      const entryId = Date.now().toString();
      state.entries.push({
        id: entryId,
        date: newEntry.date,
        reference: newEntry.reference || `REF-${entryId.slice(-4)}`,
        description: newEntry.description || 'Manual Journal Entry',
        lines: newEntry.lines.map(l => ({
          accountId: l.accountId,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        }))
      });

      logAction('Admin', `Manually posted: ${newEntry.description}`, 'General Ledger');

      newEntry.showModal = false;
      newEntry.reference = '';
      newEntry.description = '';
      newEntry.lines = [
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 }
      ];
    };

    const closeModal = () => {
      newEntry.showModal = false;
    };

    return { state, newEntry, totals, isBalanced, balanceDifference, addEntry, closeModal };
  },
  render() {
    return h('div', { class: 'animate-fade space-y-8' }, [
      h('div', { class: 'flex justify-between items-end mb-10' }, [
        h('div', [
          h('h2', { class: 'text-5xl font-black text-slate-900' }, 'General Ledger'),
          h('p', { class: 'text-xl text-slate-500 font-medium mt-2' }, 'Institutional double-entry records.')
        ]),
        h('button', { 
          onClick: () => this.newEntry.showModal = true,
          class: 'green-gradient text-white px-12 py-5 rounded-2xl font-black text-lg shadow-2xl hover:scale-[1.02] transition active:scale-95 flex items-center gap-3' 
        }, [
          h('span', { class: 'text-2xl' }, '+'),
          'ADD NEW ENTRY'
        ])
      ]),

      h('div', { class: 'premium-card overflow-hidden shadow-2xl' }, [
        this.state.entries.length === 0 ? 
        h('div', { class: 'py-32 text-center space-y-6' }, [
          h('div', { class: 'text-7xl opacity-20' }, '📓'),
          h('p', { class: 'text-2xl text-slate-400 font-bold italic' }, 'No journal entries recorded for the current period.')
        ]) :
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-[0.3em]' }, [
            h('tr', [
              h('th', { class: 'px-10 py-7' }, 'Date'),
              h('th', { class: 'px-10 py-7' }, 'Description & Ref'),
              h('th', { class: 'px-10 py-7' }, 'Accounts'),
              h('th', { class: 'px-10 py-7 text-right' }, 'Debit (₱)'),
              h('th', { class: 'px-10 py-7 text-right' }, 'Credit (₱)')
            ])
          ]),
          h('tbody', { class: 'divide-y divide-slate-100' }, this.state.entries.slice().reverse().map(e => 
            h('tr', { key: e.id, class: 'hover:bg-slate-50/50 transition-colors' }, [
              h('td', { class: 'px-10 py-8 text-lg font-bold text-slate-500 align-top' }, e.date),
              h('td', { class: 'px-10 py-8 align-top' }, [
                h('p', { class: 'text-xl font-black text-slate-800' }, e.description),
                h('p', { class: 'text-xs text-emerald-600 font-black uppercase tracking-widest mt-2' }, e.reference)
              ]),
              h('td', { class: 'px-10 py-8 align-top space-y-4' }, e.lines.map((l, idx) => 
                h('p', { key: idx, class: `text-lg font-bold ${l.credit > 0 ? 'pl-8 text-slate-500' : 'text-slate-700'}` }, 
                  this.state.accounts.find(a => a.id === l.accountId)?.name || 'Unknown'
                )
              )),
              h('td', { class: 'px-10 py-8 text-right align-top space-y-4' }, e.lines.map((l, idx) => 
                h('p', { key: idx, class: 'text-lg font-black text-emerald-600' }, l.debit > 0 ? `₱${Number(l.debit).toLocaleString()}` : '-')
              )),
              h('td', { class: 'px-10 py-8 text-right align-top space-y-4' }, e.lines.map((l, idx) => 
                h('p', { key: idx, class: 'text-lg font-black text-slate-400' }, l.credit > 0 ? `₱${Number(l.credit).toLocaleString()}` : '-')
              ))
            ])
          ))
        ])
      ]),

      this.newEntry.showModal ? h('div', { class: 'fixed inset-0 bg-slate-800/50 flex items-center justify-center z-50 p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[3rem] w-full max-w-5xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] relative animate-fade' }, [
          
          h('button', { 
            onClick: this.closeModal,
            class: 'absolute top-10 right-10 w-12 h-12 flex items-center justify-center text-black font-black text-xl hover:opacity-60 transition-opacity'
          }, '✕'),

          h('h3', { class: 'text-4xl font-black mb-12 text-slate-900 border-b pb-8 text-center shrink-0' }, 'Manual Journal Posting'),
          
          h('div', { class: 'grid grid-cols-2 gap-10 mb-12 shrink-0' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase tracking-widest mb-3' }, 'Transaction Date'),
              h('input', { type: 'date', value: this.newEntry.date, onInput: e => this.newEntry.date = e.target.value, class: 'w-full p-5 rounded-2xl font-bold text-lg' })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase tracking-widest mb-3' }, 'Official Description'),
              h('input', { placeholder: 'e.g. Science Equipment Purchase', value: this.newEntry.description, onInput: e => this.newEntry.description = e.target.value, class: 'w-full p-5 rounded-2xl font-bold text-lg' })
            ])
          ]),

          h('div', { class: 'space-y-5 flex-1 overflow-y-auto pr-4 mb-10' }, this.newEntry.lines.map((l, idx) => 
            h('div', { key: idx, class: 'grid grid-cols-12 gap-6 items-center' }, [
              h('div', { class: 'col-span-6' }, [
                h('select', { 
                  value: l.accountId, 
                  onChange: e => l.accountId = e.target.value,
                  class: 'w-full p-5 rounded-2xl font-bold text-lg' 
                }, [
                  h('option', { value: '' }, 'Select Account Code...'),
                  ...this.state.accounts.map(a => h('option', { value: a.id }, `${a.code} - ${a.name}`))
                ])
              ]),
              h('div', { class: 'col-span-3' }, [
                h('input', { 
                  type: 'number', 
                  placeholder: 'Debit (₱)', 
                  value: l.debit, 
                  onInput: e => l.debit = Number(e.target.value), 
                  class: 'w-full p-5 rounded-2xl text-right font-black text-2xl text-emerald-600' 
                })
              ]),
              h('div', { class: 'col-span-3' }, [
                h('input', { 
                  type: 'number', 
                  placeholder: 'Credit (₱)', 
                  value: l.credit, 
                  onInput: e => l.credit = Number(e.target.value), 
                  class: 'w-full p-5 rounded-2xl text-right font-black text-2xl text-slate-500' 
                })
              ])
            ])
          )),

          h('div', { class: 'py-10 border-t mt-auto shrink-0' }, [
             h('div', { class: 'flex justify-between items-center mb-8' }, [
               h('button', { onClick: () => this.newEntry.lines.push({ accountId: '', debit: 0, credit: 0 }), class: 'text-emerald-600 font-black text-sm uppercase hover:underline tracking-widest' }, '+ ADD TRANSACTION LINE'),
               h('div', { class: 'flex gap-12 text-right' }, [
                 h('div', [
                   h('p', { class: 'text-xs text-slate-400 font-black uppercase mb-1' }, 'Total Debit'),
                   h('p', { class: 'text-4xl font-black text-emerald-600' }, `₱${Number(this.totals.debit).toLocaleString()}`)
                 ]),
                 h('div', [
                   h('p', { class: 'text-xs text-slate-400 font-black uppercase mb-1' }, 'Total Credit'),
                   h('p', { class: 'text-4xl font-black text-slate-800' }, `₱${Number(this.totals.credit).toLocaleString()}`)
                 ])
               ])
             ]),

             h('div', { class: 'flex items-center gap-6' }, [
                h('button', { onClick: this.closeModal, class: 'p-6 rounded-3xl font-black bg-red-600 text-white transition-all text-lg hover:bg-red-700' }, 'DISCARD & EXIT'),
                h('div', { class: 'flex-1 relative' }, [
                  h('button', { 
                    onClick: this.addEntry,
                    disabled: !this.isBalanced,
                    class: `w-full p-8 rounded-[2rem] text-white font-black transition-all text-2xl shadow-2xl flex items-center justify-center gap-4 ${
                      this.isBalanced 
                      ? 'green-gradient hover:scale-[1.01] cursor-pointer' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-dashed border-slate-200'
                    }`
                  }, [
                    h('span', { class: 'opacity-50' }, '📁'),
                    'POST TO LEDGER'
                  ]),
                  !this.isBalanced ? h('div', { class: 'absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap' }, [
                    h('span', '⚠️ UNBALANCED'),
                    h('span', { class: 'opacity-70 border-l border-white/30 pl-2' }, `Difference: ₱${this.balanceDifference.toLocaleString()}`)
                  ]) : h('div', { class: 'absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2' }, [
                    h('span', '✅ READY TO POST')
                  ])
                ])
             ])
          ])
        ])
      ]) : null
    ]);
  }
});
