
import { defineComponent, h, reactive } from 'vue';
import { state, useAccounting } from '../state.js';

export default defineComponent({
  name: 'Payroll',
  setup() {
    const { postTransaction } = useAccounting();
    const ui = reactive({ showModal: false, staffId: '', gross: 0, tax: 0 });

    const processPayroll = () => {
      const person = state.staff.find(s => s.id === ui.staffId);
      if (!person) return;
      
      const net = ui.gross - ui.tax;
      
      postTransaction(
        `Payroll Disbursement: ${person.name}`,
        `PRL-${Date.now().toString().slice(-4)}`,
        [
          { accountId: '7', debit: ui.gross, credit: 0 },
          { accountId: '1', debit: 0, credit: net }
        ],
        'Payroll'
      );
      
      state.payrollRecords.unshift({ 
        date: new Date().toLocaleDateString(), 
        name: person.name, 
        gross: ui.gross,
        tax: ui.tax,
        net: net 
      });
      ui.showModal = false;
    };

    const selectStaff = (id) => {
      const person = state.staff.find(s => s.id === id);
      if (person) {
        ui.staffId = id;
        ui.gross = person.basicPay;
        ui.tax = person.basicPay * 0.1;
      }
    };

    return { state, ui, processPayroll, selectStaff };
  },
  render() {
    return h('div', { class: 'space-y-12' }, [
      h('div', { class: 'bg-white p-12 rounded-[3rem] shadow-sm border border-emerald-50' }, [
        h('div', { class: 'flex justify-between items-center mb-12' }, [
          h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Institutional Staff Payroll'),
          h('button', { 
            onClick: () => this.ui.showModal = true,
            class: 'green-gradient text-white px-10 py-4 rounded-2xl text-base font-black shadow-lg shadow-emerald-100' 
          }, '💸 RUN NEW PAYROLL')
        ]),
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'text-xs font-black text-slate-400 uppercase tracking-widest' }, [
            h('tr', [
              h('th', { class: 'pb-8' }, 'Payment Date'),
              h('th', { class: 'pb-8' }, 'Employee'),
              h('th', { class: 'pb-8 text-right' }, 'Net Take Home')
            ])
          ]),
          h('tbody', { class: 'divide-y divide-emerald-50/50' }, this.state.payrollRecords.map(p => 
            h('tr', [
              h('td', { class: 'py-6 text-slate-500 font-semibold' }, p.date),
              h('td', { class: 'py-6 font-bold text-lg text-slate-800' }, p.name),
              h('td', { class: 'py-6 text-right font-black text-xl text-emerald-600' }, `₱${p.net.toLocaleString()}`)
            ])
          )),
          this.state.payrollRecords.length === 0 ? h('tr', [h('td', { colspan: 3, class: 'py-20 text-center text-slate-300 italic' }, 'No payroll history for this period.')]) : null
        ])
      ]),

      this.ui.showModal ? h('div', { class: 'fixed inset-0 bg-slate-800/50 flex items-center justify-center z-50 p-10' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-2xl shadow-2xl border border-emerald-100 animate-fade relative' }, [
          h('button', { onClick: () => this.ui.showModal = false, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-3xl font-black mb-12 text-slate-800' }, 'Process Disbursement'),
          h('div', { class: 'space-y-8' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Employee Registry'),
              h('select', { 
                value: this.ui.staffId, 
                onChange: e => this.selectStaff(e.target.value),
                class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl outline-none font-bold text-lg'
              }, [
                h('option', { value: '' }, 'Choose Staff Member...'),
                ...this.state.staff.map(s => h('option', { value: s.id }, s.name))
              ])
            ]),
            h('div', { class: 'grid grid-cols-2 gap-8' }, [
              h('div', [
                h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Gross Salary (₱)'),
                h('input', { 
                  type: 'number',
                  value: this.ui.gross,
                  onInput: e => this.ui.gross = e.target.value,
                  class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl font-bold text-lg outline-none'
                })
              ]),
              h('div', [
                h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-3' }, 'Tax Withheld (₱)'),
                h('input', { 
                  type: 'number',
                  value: this.ui.tax,
                  onInput: e => this.ui.tax = e.target.value,
                  class: 'w-full p-5 bg-emerald-50/30 border-none rounded-3xl font-bold text-lg outline-none text-rose-500'
                })
              ])
            ]),
            h('div', { class: 'p-8 bg-emerald-50/50 rounded-3xl text-center' }, [
              h('p', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2' }, 'Estimated Net Disbursement'),
              h('p', { class: 'text-4xl font-black text-slate-800' }, `₱${(this.ui.gross - this.ui.tax).toLocaleString()}`)
            ]),
            h('div', { class: 'flex gap-6 pt-10' }, [
              h('button', { onClick: () => this.ui.showModal = false, class: 'flex-1 p-6 rounded-[2rem] font-black bg-red-600 text-white text-lg hover:bg-red-700' }, 'DISCARD'),
              h('button', { onClick: this.processPayroll, class: 'flex-[2] p-6 green-gradient text-white rounded-[2rem] font-black shadow-lg shadow-emerald-100 text-lg' }, 'APPROVE PAYROLL')
            ])
          ])
        ])
      ]) : null
    ]);
  }
});
