
import { defineComponent, h, reactive, computed } from 'vue';
import { state, useAccounting, logAction } from '../state.js';

export default defineComponent({
  name: 'Payroll',
  setup() {
    const { postTransaction } = useAccounting();
    
    const ui = reactive({ 
      activeSubTab: 'history', // 'history' | 'directory' | 'settings' | 'register'
      showStaffModal: false,
      showPayrollModal: false,
      showPaySlipModal: false,
      
      // Staff Profile State
      staffId: '',
      staffName: '',
      staffPosition: '',
      staffCategory: 'Faculty',
      staffBasic: 0,
      dedProfile: {
        statutory: { sss: 0, pagIbig: 0, philHealth: 0 },
        custom: []
      },
      // Loan Configuration
      loanPrincipal: 0,
      loanTerms: 0,
      loanBalance: 0,
      isEditing: false,

      // Disbursement State
      targetStaffId: '',
      runBasic: 0,
      runAllowance: 0,
      runOvertime: 0,
      runInstitutionalItems: [],
      runStatutoryTotal: 0,
      runPersonalTotal: 0,
      runLoanDeduction: 0,
      runTax: 0,
      runDescription: 'Monthly Salary Disbursement',

      // Document Viewer
      selectedSlip: null
    });

    // --- PHILIPPINE TAXATION ENGINE (TRAIN LAW 2023-2030) ---
    const calculateWithholdingTax = (taxableIncome) => {
      // Monthly Graduated Tax Table (BIR TRAIN Law)
      if (taxableIncome <= 20833) return 0;
      if (taxableIncome <= 33333) return (taxableIncome - 20833) * 0.15;
      if (taxableIncome <= 66667) return 1875 + (taxableIncome - 33333) * 0.20;
      if (taxableIncome <= 166667) return 8541.67 + (taxableIncome - 66667) * 0.25;
      if (taxableIncome <= 666667) return 33541.67 + (taxableIncome - 166667) * 0.30;
      return 183541.67 + (taxableIncome - 666667) * 0.35;
    };

    const institutionalTotal = computed(() => {
      return state.payrollSettings.institutionalDeductions.reduce((sum, d) => sum + Number(d.value), 0);
    });

    const disbursementMath = computed(() => {
      const gross = Number(ui.runBasic) + Number(ui.runAllowance) + Number(ui.runOvertime);
      const statTotal = Number(ui.runStatutoryTotal);
      
      // Taxable Income = Gross - (SSS + PhilHealth + PagIbig)
      const taxableIncome = Math.max(0, gross - statTotal);
      const tax = calculateWithholdingTax(taxableIncome);
      
      const instTotal = ui.runInstitutionalItems.reduce((sum, d) => sum + Number(d.value), 0);
      const totalDeductions = instTotal + statTotal + ui.runPersonalTotal + tax + ui.runLoanDeduction;
      const net = Math.max(0, gross - totalDeductions);

      return { gross, taxableIncome, tax, totalDeductions, net };
    });

    // --- Personnel Management ---
    const openStaffModal = (person = null) => {
      if (person) {
        ui.staffId = person.id;
        ui.staffName = person.name;
        ui.staffPosition = person.position;
        ui.staffCategory = person.category;
        ui.staffBasic = person.basicPay;
        ui.dedProfile = JSON.parse(JSON.stringify(person.deductionProfile || { statutory: { sss: 0, pagIbig: 0, philHealth: 0 }, custom: [] }));
        ui.loanPrincipal = person.loan?.principal || 0;
        ui.loanTerms = person.loan?.termsRemaining || 0;
        ui.loanBalance = person.loan?.balance || 0;
        ui.isEditing = true;
      } else {
        ui.staffId = 'ST' + Math.random().toString(36).substr(2, 4).toUpperCase();
        ui.staffName = ''; ui.staffPosition = ''; ui.staffCategory = 'Faculty'; ui.staffBasic = 0;
        ui.dedProfile = { statutory: { sss: 0, pagIbig: 0, philHealth: 0 }, custom: [] };
        ui.loanPrincipal = 0; ui.loanTerms = 0; ui.loanBalance = 0;
        ui.isEditing = false;
      }
      ui.showStaffModal = true;
    };

    const saveStaff = () => {
      const monthlyAmort = ui.loanTerms > 0 ? (ui.loanPrincipal / ui.loanTerms) : 0;
      const data = {
        id: ui.staffId,
        name: ui.staffName,
        position: ui.staffPosition,
        category: ui.staffCategory,
        basicPay: Number(ui.staffBasic),
        deductionProfile: JSON.parse(JSON.stringify(ui.dedProfile)),
        loan: {
          principal: Number(ui.loanPrincipal),
          balance: ui.isEditing ? Number(ui.loanBalance) : Number(ui.loanPrincipal),
          termsRemaining: Number(ui.loanTerms),
          monthlyAmortization: Math.round(monthlyAmort * 100) / 100
        }
      };

      if (ui.isEditing) {
        const index = state.staff.findIndex(s => s.id === ui.staffId);
        if (index !== -1) state.staff[index] = data;
      } else {
        state.staff.push(data);
      }
      ui.showStaffModal = false;
      logAction('Admin', `${ui.isEditing ? 'Updated' : 'Enrolled'} profile for ${ui.staffName}`, 'HR');
    };

    const generateProfilePaySlip = () => {
      const monthlyLoanAmort = ui.loanTerms > 0 ? (ui.loanPrincipal / ui.loanTerms) : 0;
      const statSum = Number(ui.dedProfile.statutory.sss) + Number(ui.dedProfile.statutory.pagIbig) + Number(ui.dedProfile.statutory.philHealth);
      const taxableIncome = Number(ui.staffBasic) - statSum;
      const tax = calculateWithholdingTax(taxableIncome);
      const instItems = JSON.parse(JSON.stringify(state.payrollSettings.institutionalDeductions));
      const instSum = instItems.reduce((s, i) => s + Number(i.value), 0);
      const totalDeds = instSum + statSum + tax + monthlyLoanAmort;

      ui.selectedSlip = {
        id: 'PREVIEW-' + Date.now().toString().slice(-4),
        date: new Date().toLocaleDateString() + ' (PREVIEW)',
        name: ui.staffName || 'Unnamed Personnel',
        position: ui.staffPosition || 'No Position',
        staffId: ui.staffId,
        basic: Number(ui.staffBasic),
        allowance: 0,
        overtime: 0,
        gross: Number(ui.staffBasic),
        taxableIncome: taxableIncome,
        institutionalItems: instItems,
        institutional: instSum,
        statutoryItems: ui.dedProfile.statutory,
        statutory: statSum,
        personalItems: [],
        loanDeduction: Math.round(monthlyLoanAmort * 100) / 100,
        tax: tax,
        other: tax,
        net: Math.max(0, Number(ui.staffBasic) - totalDeds)
      };
      ui.showPaySlipModal = true;
    };

    const addGlobalDeduction = () => {
      state.payrollSettings.institutionalDeductions.push({ id: Date.now(), name: 'New Rate', value: 0 });
    };

    const removeGlobalDeduction = (id) => {
      state.payrollSettings.institutionalDeductions = state.payrollSettings.institutionalDeductions.filter(d => d.id !== id);
    };

    const openPayrollModal = (person) => {
      ui.targetStaffId = person.id;
      ui.runBasic = person.basicPay;
      ui.runAllowance = 0; ui.runOvertime = 0;
      ui.runInstitutionalItems = JSON.parse(JSON.stringify(state.payrollSettings.institutionalDeductions));
      const prof = person.deductionProfile;
      const stat = prof.statutory || { sss: 0, pagIbig: 0, philHealth: 0 };
      ui.runStatutoryTotal = Number(stat.sss) + Number(stat.pagIbig) + Number(stat.philHealth);
      ui.runPersonalTotal = prof.custom?.reduce((sum, d) => sum + Number(d.value), 0) || 0;
      ui.runLoanDeduction = person.loan?.balance > 0 ? person.loan.monthlyAmortization : 0;
      ui.showPayrollModal = true;
    };

    const executePayroll = () => {
      const person = state.staff.find(s => s.id === ui.targetStaffId);
      if (!person) return;
      
      const { gross, net, tax, taxableIncome } = disbursementMath.value;
      const instTotal = ui.runInstitutionalItems.reduce((s, i) => s + Number(i.value), 0);

      if (person.loan && person.loan.balance > 0) {
        person.loan.balance = Math.round(Math.max(0, person.loan.balance - ui.runLoanDeduction) * 100) / 100;
        person.loan.termsRemaining = Math.max(0, person.loan.termsRemaining - 1);
      }

      postTransaction(
        `Monthly Payroll: ${person.name}`,
        `PAY-${Date.now().toString().slice(-4)}`,
        [{ accountId: '7', debit: gross, credit: 0 }, { accountId: '1', debit: 0, credit: net }],
        'Payroll', { staffId: person.id }
      );

      state.payrollRecords.unshift({
        id: Date.now(), 
        date: new Date().toLocaleDateString(), 
        name: person.name, 
        position: person.position,
        staffId: person.id,
        basic: ui.runBasic,
        allowance: ui.runAllowance,
        overtime: ui.runOvertime,
        gross, 
        taxableIncome,
        statutoryItems: JSON.parse(JSON.stringify(person.deductionProfile.statutory)),
        statutory: ui.runStatutoryTotal,
        institutionalItems: JSON.parse(JSON.stringify(ui.runInstitutionalItems)),
        institutional: instTotal,
        personalItems: JSON.parse(JSON.stringify(person.deductionProfile.custom || [])),
        loanDeduction: ui.runLoanDeduction,
        tax: tax,
        other: tax,
        net 
      });
      ui.showPayrollModal = false;
    };

    return { 
      ui, state, disbursementMath, institutionalTotal, 
      openStaffModal, saveStaff, openPayrollModal, 
      executePayroll, addGlobalDeduction, removeGlobalDeduction, generateProfilePaySlip 
    };
  },
  render() {
    return h('div', { class: 'animate-fade space-y-10' }, [
      
      // SUB-NAVIGATION (HIDDEN DURING PRINT)
      h('div', { class: 'no-print flex gap-4 bg-white p-2 rounded-2xl w-fit shadow-sm border border-slate-100 mb-10 mx-auto' }, [
        h('button', { onClick: () => this.ui.activeSubTab = 'history', class: `px-8 py-3 rounded-xl text-[10px] font-black uppercase transition ${this.ui.activeSubTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-400'}` }, 'Journal'),
        h('button', { onClick: () => this.ui.activeSubTab = 'directory', class: `px-8 py-3 rounded-xl text-[10px] font-black uppercase transition ${this.ui.activeSubTab === 'directory' ? 'bg-slate-900 text-white' : 'text-slate-400'}` }, 'Staff Registry'),
        h('button', { onClick: () => this.ui.activeSubTab = 'settings', class: `px-8 py-3 rounded-xl text-[10px] font-black uppercase transition ${this.ui.activeSubTab === 'settings' ? 'bg-slate-900 text-white' : 'text-slate-400'}` }, 'Institutional Rates'),
        h('button', { onClick: () => this.ui.activeSubTab = 'register', class: `px-8 py-3 rounded-xl text-[10px] font-black uppercase transition ${this.ui.activeSubTab === 'register' ? 'bg-emerald-600 text-white' : 'text-slate-400'}` }, 'General Payroll')
      ]),

      // --- 1. JOURNAL VIEW (HISTORY) ---
      this.ui.activeSubTab === 'history' ? h('div', { class: 'premium-card overflow-hidden shadow-sm' }, [
        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest' }, [
            h('tr', [h('th', { class: 'px-8 py-5' }, 'Date'), h('th', { class: 'px-6 py-5' }, 'Personnel'), h('th', { class: 'px-6 py-5 text-right' }, 'Net Pay'), h('th', { class: 'px-8 py-5 text-center' }, 'Action')])
          ]),
          h('tbody', { class: 'divide-y divide-slate-50' }, this.state.payrollRecords.map(p => h('tr', [
            h('td', { class: 'px-8 py-6 font-bold text-slate-400 text-xs' }, p.date),
            h('td', { class: 'px-6 py-6 font-black text-slate-800 text-sm' }, p.name),
            h('td', { class: 'px-6 py-6 text-right font-black text-lg text-emerald-600' }, `₱${Math.round(p.net).toLocaleString()}`),
            h('td', { class: 'px-8 py-6 text-center' }, [
              h('button', { onClick: () => { this.ui.selectedSlip = p; this.ui.showPaySlipModal = true; }, class: 'text-[9px] font-black border border-slate-200 px-4 py-2 rounded-lg hover:text-emerald-600 transition' }, '📄 VIEW PAY SLIP')
            ])
          ])))
        ]),
        this.state.payrollRecords.length === 0 ? h('div', { class: 'p-20 text-center opacity-30 italic font-bold' }, 'No payroll history recorded.') : null
      ]) : null,

      // --- 2. STAFF REGISTRY ---
      this.ui.activeSubTab === 'directory' ? h('div', { class: 'space-y-8 animate-fade' }, [
        h('div', { class: 'flex justify-between items-center px-4' }, [
          h('div', [h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Personnel Registry'), h('p', { class: 'text-sm text-slate-400 font-bold' }, 'Manage individual salary profiles and active loan balances.')]),
          h('button', { onClick: () => this.openStaffModal(), class: 'green-gradient text-white px-8 py-3.5 rounded-xl font-black text-xs shadow-lg' }, '+ ENROLL STAFF')
        ]),
        h('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-6' }, this.state.staff.map(person => 
          h('div', { class: 'premium-card p-8 flex justify-between items-center hover:shadow-lg transition' }, [
            h('div', [
              h('h4', { class: 'text-xl font-black text-slate-800' }, person.name),
              h('p', { class: 'text-emerald-600 font-black text-[9px] uppercase' }, `${person.category} • ${person.position}`),
              person.loan?.balance > 0 ? h('p', { class: 'text-[7px] text-rose-500 font-black mt-1 uppercase' }, `LOAN BAL: ₱${person.loan.balance.toLocaleString()}`) : null
            ]),
            h('div', { class: 'flex flex-col gap-2 items-end' }, [
              h('button', { onClick: () => this.openPayrollModal(person), class: 'px-5 py-2.5 bg-slate-900 text-white rounded-lg font-black text-[9px] hover:bg-emerald-600 transition' }, 'DISBURSE'),
              h('button', { onClick: () => this.openStaffModal(person), class: 'text-[9px] font-bold text-slate-400 uppercase tracking-widest' }, 'Profile Settings')
            ])
          ])
        ))
      ]) : null,

      // --- 3. INSTITUTIONAL RATES (SETTINGS) ---
      this.ui.activeSubTab === 'settings' ? h('div', { class: 'animate-fade max-w-4xl mx-auto space-y-10' }, [
        h('div', { class: 'text-center' }, [
           h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Global Rate Management'),
           h('p', { class: 'text-slate-400 text-sm font-bold' }, 'Define school-wide mandatory deductions like Uniforms, T-Shirts, and Donations.')
        ]),
        h('div', { class: 'premium-card p-10 space-y-8' }, [
          h('div', { class: 'flex justify-between items-center' }, [
            h('h4', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-widest' }, 'Active Policy Deductions'),
            h('button', { onClick: this.addGlobalDeduction, class: 'text-[10px] font-black text-white bg-slate-900 px-5 py-2.5 rounded-xl' }, '+ ADD NEW RATE')
          ]),
          h('div', { class: 'space-y-4' }, this.state.payrollSettings.institutionalDeductions.map(d => 
            h('div', { class: 'flex items-center gap-6 bg-slate-50 p-6 rounded-2xl border' }, [
              h('div', { class: 'flex-1' }, [
                h('label', { class: 'block text-[9px] font-black text-slate-400 uppercase mb-2' }, 'Rate Label'),
                h('input', { value: d.name, onInput: e => d.name = e.target.value, class: 'w-full bg-transparent border-none p-0 font-bold text-lg' })
              ]),
              h('div', { class: 'w-48 text-right' }, [
                h('label', { class: 'block text-[9px] font-black text-slate-400 uppercase mb-2' }, 'Amount (₱)'),
                h('input', { type: 'number', value: d.value, onInput: e => d.value = Number(e.target.value), class: 'w-full bg-white px-4 py-2 rounded-xl font-black text-xl text-rose-600 text-right' })
              ]),
              h('button', { onClick: () => this.removeGlobalDeduction(d.id), class: 'text-slate-300 hover:text-rose-500 font-black ml-4' }, '✕')
            ])
          )),
          h('div', { class: 'pt-8 border-t flex justify-between items-center' }, [
            h('p', { class: 'text-[10px] font-black text-slate-400 uppercase' }, 'Total Monthly Institutional Impact'),
            h('p', { class: 'text-3xl font-black text-slate-900' }, `₱${this.institutionalTotal.toLocaleString()}`)
          ])
        ])
      ]) : null,

      // --- 4. GENERAL PAYROLL REGISTER ---
      this.ui.activeSubTab === 'register' ? h('div', { class: 'animate-fade space-y-12 pb-20' }, [
        h('div', { class: 'flex justify-between items-end no-print' }, [
           h('h3', { class: 'text-3xl font-black text-slate-900' }, 'General Payroll Register'),
           h('button', { onClick: () => window.print(), class: 'px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs' }, 'PRINT MASTER REGISTRY')
        ]),
        h('div', { class: 'premium-card p-10 bg-white' }, [
          h('div', { class: 'text-center mb-12 print-only' }, [
            h('h1', { class: 'text-2xl font-black uppercase tracking-widest' }, 'SRPHS HUB Institutional Registry'),
            h('p', { class: 'text-xs font-bold mt-1' }, `Payroll Period Ending: ${new Date().toLocaleDateString()}`)
          ]),
          h('table', { class: 'w-full text-left text-xs border-collapse' }, [
            h('thead', { class: 'font-black uppercase tracking-widest border-b-2 border-slate-900 bg-slate-50' }, [
              h('tr', [
                h('th', { class: 'py-4 px-2' }, 'Name'),
                h('th', { class: 'py-4 px-2 text-right' }, 'Gross'),
                h('th', { class: 'py-4 px-2 text-right' }, 'Deductions'),
                h('th', { class: 'py-4 px-2 text-right border-l' }, 'Net Take Home'),
                h('th', { class: 'py-4 px-2 text-center border-l w-40' }, 'Acknowledgment')
              ])
            ]),
            h('tbody', { class: 'divide-y' }, this.state.payrollRecords.map(p => 
              h('tr', [
                h('td', { class: 'py-4 px-2' }, [h('p', { class: 'font-black' }, p.name), h('p', { class: 'text-[8px] text-slate-400' }, p.position)]),
                h('td', { class: 'py-4 px-2 text-right font-bold' }, `₱${p.gross.toLocaleString()}`),
                h('td', { class: 'py-4 px-2 text-right text-rose-500' }, `-₱${(p.institutional + p.statutory + p.other + (p.loanDeduction || 0)).toLocaleString()}`),
                h('td', { class: 'py-4 px-2 text-right font-black text-emerald-600 border-l' }, `₱${Math.round(p.net).toLocaleString()}`),
                h('td', { class: 'py-4 px-2 border-l' }, h('div', { class: 'border-b border-slate-300 w-full mx-auto h-6 mt-2' }))
              ])
            ))
          ]),
          this.state.payrollRecords.length === 0 ? h('div', { class: 'p-20 text-center opacity-30 italic font-black uppercase tracking-widest' }, 'Register Empty') : null
        ])
      ]) : null,

      // --- MODAL: PERSONNEL PROFILE & LOAN SETUP ---
      this.ui.showStaffModal ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-6' }, [
        h('div', { class: 'bg-white p-12 rounded-[3rem] w-full max-w-5xl shadow-2xl relative animate-fade flex flex-col max-h-[95vh] overflow-hidden' }, [
          h('button', { onClick: () => this.ui.showStaffModal = false, class: 'absolute top-10 right-10 font-black text-slate-400 hover:text-slate-900 text-xl' }, '✕'),
          h('h3', { class: 'text-4xl font-black text-slate-900 mb-8 tracking-tight' }, 'Personnel Profile & Loan Setup'),
          
          h('div', { class: 'flex-1 overflow-y-auto pr-4 space-y-10 scrollbar-hide' }, [
            h('div', { class: 'grid grid-cols-2 gap-8' }, [
              h('div', { class: 'bg-slate-50 p-10 rounded-[2.5rem] space-y-6 shadow-inner border border-slate-100' }, [
                h('div', { class: 'grid grid-cols-2 gap-4' }, [
                  h('div', [
                    h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest' }, 'Position'),
                    h('input', { value: this.ui.staffPosition, onInput: e => this.ui.staffPosition = e.target.value, class: 'w-full px-5 py-4 rounded-xl font-bold bg-white' })
                  ]),
                  h('div', [
                    h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest' }, 'Basic Pay (₱)'),
                    h('input', { type: 'number', value: this.ui.staffBasic, onInput: e => this.ui.staffBasic = Number(e.target.value), class: 'w-full px-5 py-4 rounded-xl font-black text-emerald-700 text-xl bg-white' })
                  ])
                ]),
                h('div', [
                   h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest' }, 'Staff Name'),
                   h('input', { value: this.ui.staffName, onInput: e => this.ui.staffName = e.target.value, class: 'w-full px-5 py-5 rounded-xl font-black text-lg bg-white' })
                ])
              ]),
              h('div', { class: 'bg-rose-50/40 p-10 rounded-[2.5rem] border border-rose-100 flex flex-col justify-between' }, [
                 h('div', { class: 'grid grid-cols-2 gap-4' }, [
                    h('div', [
                      h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase' }, 'Principal Loan'),
                      h('input', { type: 'number', value: this.ui.loanPrincipal, onInput: e => this.ui.loanPrincipal = Number(e.target.value), class: 'w-full px-4 py-4 rounded-xl bg-white font-black text-rose-600' })
                    ]),
                    h('div', [
                      h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase' }, 'Loan Terms (Mos)'),
                      h('input', { type: 'number', value: this.ui.loanTerms, onInput: e => this.ui.loanTerms = Number(e.target.value), class: 'w-full px-4 py-4 rounded-xl bg-white font-black' })
                    ])
                 ]),
                 h('div', { class: 'mt-6 pt-4 border-t border-rose-100 flex justify-between items-center' }, [
                    h('p', { class: 'text-[9px] font-black text-slate-400 uppercase tracking-widest' }, 'Computed Monthly Amortization'),
                    h('p', { class: 'text-5xl font-black text-rose-700 tracking-tighter' }, `₱${(this.ui.loanTerms > 0 ? Math.round(this.ui.loanPrincipal / this.ui.loanTerms) : 0).toLocaleString()}`)
                 ])
              ])
            ]),
            h('div', { class: 'bg-slate-900 text-white p-10 rounded-[2.5rem] space-y-6 shadow-2xl' }, [
               h('div', { class: 'flex justify-between items-center' }, [
                  h('h4', { class: 'text-[10px] font-black text-emerald-400 uppercase tracking-widest' }, 'Active Institutional Deduction Rates'),
                  h('span', { class: 'text-[10px] font-black text-white/50 uppercase' }, 'Policy Status')
               ]),
               h('div', { class: 'grid grid-cols-3 gap-6' }, this.state.payrollSettings.institutionalDeductions.map(rate => 
                 h('div', { class: 'bg-white/5 p-5 rounded-2xl border border-white/10' }, [
                    h('p', { class: 'text-[9px] font-black text-emerald-500 uppercase mb-1' }, rate.name),
                    h('p', { class: 'text-xl font-black' }, `₱${rate.value.toLocaleString()}`)
                 ])
               )),
               h('div', { class: 'pt-4 border-t border-white/10 flex justify-between items-center' }, [
                  h('p', { class: 'text-[9px] font-black text-slate-400 uppercase' }, 'Combined Institutional Policy Amount'),
                  h('p', { class: 'text-2xl font-black text-emerald-400' }, `₱${this.institutionalTotal.toLocaleString()}`)
               ])
            ]),
            h('div', { class: 'bg-slate-50 p-10 rounded-[2.5rem] space-y-6 border border-slate-100' }, [
               h('h4', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest' }, 'Statutory Government Contribution'),
               h('div', { class: 'grid grid-cols-3 gap-6' }, [
                  ['SSS', 'sss'], ['Pag-IBIG', 'pagIbig'], ['PhilHealth', 'philHealth']
               ].map(([label, key]) => h('div', [
                  h('label', { class: 'block text-[9px] font-black text-slate-400 mb-2 uppercase' }, label),
                  h('input', { type: 'number', value: this.ui.dedProfile.statutory[key], onInput: e => this.ui.dedProfile.statutory[key] = Number(e.target.value), class: 'w-full px-5 py-4 rounded-xl bg-white font-black text-lg' })
               ])))
            ])
          ]),
          h('div', { class: 'mt-10 pt-8 border-t flex gap-4' }, [
            h('button', { onClick: () => this.ui.showStaffModal = false, class: 'flex-1 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs' }, 'DISCARD'),
            h('button', { onClick: this.generateProfilePaySlip, class: 'flex-1 py-5 border-2 border-emerald-500 text-emerald-600 rounded-2xl font-black uppercase text-xs' }, 'PREVIEW PAY SLIP'),
            h('button', { onClick: this.saveStaff, class: 'flex-[2] py-5 green-gradient text-white rounded-2xl font-black text-lg shadow-xl' }, 'SAVE PROFILE')
          ])
        ])
      ]) : null,

      // --- MODAL: DISBURSEMENT ENGINE ---
      this.ui.showPayrollModal ? h('div', { class: 'fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[210] p-6' }, [
        h('div', { class: 'bg-white p-12 rounded-[3.5rem] w-full max-w-5xl shadow-2xl relative animate-fade flex flex-col' }, [
          h('button', { onClick: () => this.ui.showPayrollModal = false, class: 'absolute top-10 right-10 text-2xl font-black' }, '✕'),
          h('h3', { class: 'text-3xl font-black text-slate-900 mb-10' }, `Disbursement: ${this.state.staff.find(s=>s.id===this.ui.targetStaffId)?.name}`),
          h('div', { class: 'grid grid-cols-2 gap-12' }, [
            h('div', { class: 'bg-emerald-50 p-10 rounded-[2rem] space-y-6' }, [
               h('h4', { class: 'text-[10px] font-black text-emerald-600 uppercase' }, 'Earnings Breakdown'),
               h('div', { class: 'flex justify-between text-xl font-black' }, [h('span', 'Basic Pay'), h('span', `₱${this.ui.runBasic.toLocaleString()}`)]),
               h('div', { class: 'grid grid-cols-2 gap-4' }, [
                 h('input', { type: 'number', value: this.ui.runAllowance, onInput: e => this.ui.runAllowance = Number(e.target.value), placeholder: 'Allowance', class: 'p-4 rounded-xl' }),
                 h('input', { type: 'number', value: this.ui.runOvertime, onInput: e => this.ui.runOvertime = Number(e.target.value), placeholder: 'Overtime', class: 'p-4 rounded-xl' })
               ]),
               h('div', { class: 'pt-4 border-t border-emerald-100' }, [
                 h('div', { class: 'flex justify-between text-xs font-black text-slate-400 uppercase mb-2' }, [h('span', 'Gross Pay'), h('span', `₱${this.disbursementMath.gross.toLocaleString()}`)]),
                 h('div', { class: 'flex justify-between text-sm font-black text-emerald-700 uppercase' }, [h('span', 'Taxable Income'), h('span', `₱${this.disbursementMath.taxableIncome.toLocaleString()}`)])
               ])
            ]),
            h('div', { class: 'bg-slate-50 p-10 rounded-[2rem] space-y-4 text-sm' }, [
               h('h4', { class: 'text-[10px] font-black text-rose-500 uppercase' }, 'Deductions Breakdown'),
               h('div', { class: 'flex justify-between' }, [h('span', 'Institutional Policy'), h('span', `₱${this.institutionalTotal.toLocaleString()}`)]),
               h('div', { class: 'flex justify-between' }, [h('span', 'Mandatory Govt (SSS/PH/PI)'), h('span', `₱${this.ui.runStatutoryTotal.toLocaleString()}`)]),
               h('div', { class: 'flex justify-between font-black text-rose-600' }, [h('span', 'Withholding Tax (TRAIN)'), h('span', `₱${Math.round(this.disbursementMath.tax).toLocaleString()}`)]),
               this.ui.runLoanDeduction > 0 ? h('div', { class: 'flex justify-between text-rose-600 font-black' }, [h('span', 'LOAN REPAYMENT'), h('span', `₱${this.ui.runLoanDeduction.toLocaleString()}`)]) : null
            ])
          ]),
          h('div', { class: 'mt-12 pt-10 border-t flex justify-between items-end' }, [
            h('div', [
              h('p', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1' }, 'Net Institutional Payout'),
              h('p', { class: 'text-7xl font-black text-emerald-600 tracking-tighter' }, `₱${Math.round(this.disbursementMath.net).toLocaleString()}`)
            ]),
            h('button', { onClick: this.executePayroll, class: 'px-16 py-8 green-gradient text-white rounded-3xl font-black text-2xl shadow-2xl hover:scale-105 transition' }, 'POST TO LEDGER')
          ])
        ])
      ]) : null,

      // --- MODAL: PAY SLIP VIEWER ---
      this.ui.showPaySlipModal && this.ui.selectedSlip ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[300] p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-4xl shadow-2xl relative animate-fade flex flex-col max-h-[95vh] overflow-y-auto scrollbar-hide' }, [
          h('button', { onClick: () => this.ui.showPaySlipModal = false, class: 'no-print absolute top-10 right-10 font-black text-xl' }, '✕'),
          h('div', { class: 'flex justify-between items-start mb-16' }, [
             h('div', [
                h('h2', { class: 'text-3xl font-black text-slate-900 tracking-tight' }, 'SRPHS HUB'),
                h('p', { class: 'text-emerald-600 font-black text-xs uppercase tracking-widest' }, 'Institutional Pay Slip'),
                h('p', { class: 'text-slate-400 font-bold text-[10px] mt-1' }, `Period: ${this.ui.selectedSlip.date}`)
             ]),
             h('button', { onClick: () => window.print(), class: 'no-print green-gradient text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl' }, 'PRINT SLIP')
          ]),
          h('div', { class: 'grid grid-cols-2 gap-12 mb-12 border-b border-slate-100 pb-12' }, [
             h('div', [h('p', { class: 'text-[9px] font-black text-slate-400 uppercase mb-1' }, 'Personnel Name'), h('p', { class: 'text-xl font-black text-slate-800' }, this.ui.selectedSlip.name), h('p', { class: 'text-xs font-bold text-slate-400 uppercase mt-1' }, this.ui.selectedSlip.position)]),
             h('div', { class: 'text-right' }, [h('p', { class: 'text-[9px] font-black text-slate-400 uppercase mb-1' }, 'Employee ID'), h('p', { class: 'text-xl font-black text-slate-800' }, this.ui.selectedSlip.staffId)])
          ]),
          h('div', { class: 'grid grid-cols-2 gap-12' }, [
             h('div', { class: 'space-y-6' }, [
                h('h4', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-widest' }, 'Earnings Breakdown'),
                h('div', { class: 'space-y-3 text-sm' }, [
                   h('div', { class: 'flex justify-between' }, [h('span', { class: 'font-bold text-slate-500' }, 'Basic Salary'), h('span', { class: 'font-black' }, `₱${this.ui.selectedSlip.basic.toLocaleString()}`)]),
                   h('div', { class: 'flex justify-between' }, [h('span', { class: 'font-bold text-slate-500' }, 'Allowances'), h('span', { class: 'font-black' }, `₱${this.ui.selectedSlip.allowance.toLocaleString()}`)]),
                   h('div', { class: 'flex justify-between' }, [h('span', { class: 'font-bold text-slate-500' }, 'Overtime Pay'), h('span', { class: 'font-black' }, `₱${this.ui.selectedSlip.overtime.toLocaleString()}`)])
                ]),
                h('div', { class: 'pt-4 border-t flex flex-col gap-2' }, [
                  h('div', { class: 'flex justify-between font-black text-lg' }, [h('span', 'Gross Earnings'), h('span', `₱${this.ui.selectedSlip.gross.toLocaleString()}`)]),
                  h('div', { class: 'flex justify-between text-xs font-black text-emerald-600' }, [h('span', 'Taxable Income'), h('span', `₱${Math.round(this.ui.selectedSlip.taxableIncome).toLocaleString()}`)])
                ])
             ]),
             h('div', { class: 'space-y-6' }, [
                h('h4', { class: 'text-[10px] font-black text-rose-500 uppercase tracking-widest' }, 'Deductions Detail'),
                h('div', { class: 'space-y-3 text-sm' }, [
                   ...(this.ui.selectedSlip.institutionalItems?.map(item => h('div', { class: 'flex justify-between' }, [h('span', { class: 'font-bold text-slate-400' }, item.name), h('span', { class: 'font-black text-rose-600' }, `-₱${item.value.toLocaleString()}`)])) || []),
                   h('div', { class: 'flex justify-between pt-2 border-t' }, [h('span', { class: 'font-bold text-slate-400' }, 'Mandatory Gov (SSS/PH/PI)'), h('span', { class: 'font-black text-rose-600' }, `-₱${this.ui.selectedSlip.statutory.toLocaleString()}`)]),
                   h('div', { class: 'flex justify-between' }, [h('span', { class: 'font-bold text-slate-400' }, 'Withholding Tax (BIR)'), h('span', { class: 'font-black text-rose-600' }, `-₱${Math.round(this.ui.selectedSlip.tax).toLocaleString()}`)]),
                   this.ui.selectedSlip.loanDeduction > 0 ? h('div', { class: 'flex justify-between text-rose-600 font-black' }, [h('span', 'SALARY LOAN REPAYMENT'), h('span', `-₱${this.ui.selectedSlip.loanDeduction.toLocaleString()}`)]) : null
                ])
             ])
          ]),
          h('div', { class: 'mt-12 p-10 bg-emerald-50 rounded-[2.5rem] flex justify-between items-center' }, [
             h('div', [h('p', { class: 'text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1' }, 'Net Take Home Pay'), h('p', { class: 'text-6xl font-black text-slate-900 tracking-tighter' }, `₱${Math.round(this.ui.selectedSlip.net).toLocaleString()}`)]),
             h('p', { class: 'text-[9px] font-black text-slate-300 italic' }, 'Official Documentation | SRPHS')
          ]),
          h('div', { class: 'mt-20 grid grid-cols-2 gap-20' }, [
             h('div', [h('div', { class: 'border-b border-slate-900 mb-2 h-10' }), h('p', { class: 'text-[9px] font-black text-slate-400 uppercase text-center' }, 'Bursar / Cashier Signature')]),
             h('div', [h('div', { class: 'border-b border-slate-900 mb-2 h-10' }), h('p', { class: 'text-[9px] font-black text-slate-400 uppercase text-center' }, 'Recipient Signature / Acknowledgment')])
          ])
        ])
      ]) : null
    ]);
  }
});
