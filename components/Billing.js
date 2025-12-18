
import { defineComponent, h, reactive, computed } from 'vue';
import { state, useAccounting } from '../state.js';

export default defineComponent({
  name: 'Billing',
  setup() {
    const { postTransaction, summary } = useAccounting();
    
    const ui = reactive({ 
      showPayment: false, 
      showCharge: false,
      showAddStudent: false,
      showSOA: false,
      showManageTemplates: false,
      showCreateTemplate: false,
      showApplyTemplateBatch: false,
      
      // Confirmation Modal State
      showConfirmDialog: false,
      pendingTemplate: null,
      pendingTargets: [],

      selectedStudentId: '', 
      studentSearch: '',
      
      // Selection Management
      selectedRegistryIds: [], 
      targetIndividualId: '', 
      
      // Form fields
      studentId: '', 
      amount: 0, 
      ref: '',
      description: 'Tuition',
      paymentDescription: 'Tuition',
      
      // New Student fields
      newStudentName: '',
      newStudentGrade: '',
      
      // Template UI
      templateName: '',
      templateGrade: '',
      templateLines: [{ category: 'Tuition', amount: 0 }]
    });

    const collectionsToday = computed(() => {
      const today = new Date().toISOString().split('T')[0];
      return state.entries
        .filter(e => e.date === today && e.description.includes('Payment'))
        .reduce((sum, e) => sum + Number(e.lines[0].debit || 0), 0);
    });

    const filteredStudents = computed(() => {
      const all = [...state.students];
      if (!ui.studentSearch) return all;
      const search = ui.studentSearch.toLowerCase();
      return all.filter(s => 
        s.name.toLowerCase().includes(search) ||
        s.grade.toLowerCase().includes(search)
      );
    });

    const studentLedger = computed(() => {
      if (!ui.selectedStudentId) return [];
      return state.entries.filter(e => e.meta && e.meta.studentId === ui.selectedStudentId);
    });

    const selectedStudent = computed(() => {
      const id = ui.selectedStudentId || ui.studentId || ui.targetIndividualId;
      return state.students.find(s => s.id === id);
    });

    const toggleStudentSelection = (id) => {
      const index = ui.selectedRegistryIds.indexOf(id);
      if (index === -1) {
        ui.selectedRegistryIds.push(id);
      } else {
        ui.selectedRegistryIds.splice(index, 1);
      }
    };

    const toggleSelectAllVisible = () => {
      if (ui.selectedRegistryIds.length === filteredStudents.value.length && filteredStudents.value.length > 0) {
        ui.selectedRegistryIds = [];
      } else {
        ui.selectedRegistryIds = filteredStudents.value.map(s => s.id);
      }
    };

    // CORE BILLING ENGINE
    const applyTemplateToStudents = (studentIds, template) => {
      console.group('🚀 BILLING ENGINE: Batch Processing');
      const totalAmount = template.items.reduce((sum, item) => sum + Number(item.amount), 0);
      const breakdown = template.items.map(i => i.category).join(', ');

      studentIds.forEach((id, index) => {
        const student = state.students.find(s => s.id === id);
        if (student) {
          student.balance = (Number(student.balance) || 0) + totalAmount;
          const refID = `BATCH-${Date.now().toString().slice(-4)}-${index}`;
          postTransaction(
            `${student.name} - Billing: ${template.name} (${breakdown})`,
            refID,
            [
              { accountId: '2', debit: totalAmount, credit: 0 },
              { accountId: '6', debit: 0, credit: totalAmount }
            ],
            'Billing',
            { studentId: student.id, templateId: template.id }
          );
        }
      });
      console.groupEnd();
    };

    const initiateTemplateAction = (templateId) => {
      const template = state.feeTemplates.find(t => t.id === templateId);
      if (!template) return;

      let targets = [];
      if (ui.targetIndividualId) {
        targets = [ui.targetIndividualId];
      } else if (ui.selectedRegistryIds.length > 0) {
        targets = [...ui.selectedRegistryIds];
      }

      if (targets.length === 0) return;

      ui.pendingTemplate = template;
      ui.pendingTargets = targets;
      ui.showConfirmDialog = true;
    };

    const confirmAndPost = () => {
      applyTemplateToStudents(ui.pendingTargets, ui.pendingTemplate);
      ui.selectedRegistryIds = [];
      ui.targetIndividualId = '';
      ui.showConfirmDialog = false;
      ui.showApplyTemplateBatch = false;
      ui.showManageTemplates = false;
      ui.pendingTemplate = null;
      ui.pendingTargets = [];
    };

    const addStudent = () => {
      if (!ui.newStudentName.trim() || !ui.newStudentGrade.trim()) return;
      state.students.push({
        id: 'S' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: ui.newStudentName.trim(),
        grade: ui.newStudentGrade.trim(),
        balance: 0
      });
      ui.showAddStudent = false;
      ui.newStudentName = '';
      ui.newStudentGrade = '';
    };

    const addTemplate = () => {
      if (!ui.templateName.trim() || !ui.templateGrade.trim()) {
        alert("Please provide both a Template Name and a Target Grade Level.");
        return;
      }
      
      if (ui.templateLines.length === 0) {
        alert("Please add at least one fee line item.");
        return;
      }

      const newTemplate = {
        id: 'T' + Date.now().toString().slice(-6),
        name: ui.templateName.trim(),
        gradeLevel: ui.templateGrade.trim(),
        items: ui.templateLines.map(l => ({ 
          category: l.category, 
          amount: Number(l.amount) || 0 
        }))
      };

      state.feeTemplates.push(newTemplate);
      
      // Success Cleanup
      ui.showCreateTemplate = false;
      ui.templateName = '';
      ui.templateGrade = '';
      ui.templateLines = [{ category: 'Tuition', amount: 0 }];
    };

    const assessFee = () => {
      const student = state.students.find(s => s.id === ui.studentId);
      const amountVal = Number(ui.amount);
      if (!student || amountVal <= 0) return;
      
      student.balance = (Number(student.balance) || 0) + amountVal;
      postTransaction(
        `${student.name} - Direct Fee: ${ui.description}`, 
        `INV-${Date.now().toString().slice(-4)}`,
        [{ accountId: '2', debit: amountVal, credit: 0 }, { accountId: '6', debit: 0, credit: amountVal }],
        'Billing', 
        { studentId: student.id }
      );
      ui.showCharge = false; 
      ui.amount = 0;
      ui.description = 'Tuition';
    };

    const postPayment = () => {
      const student = state.students.find(s => s.id === ui.studentId);
      const amountVal = Number(ui.amount);
      if (!student || amountVal <= 0) return;
      
      student.balance = (Number(student.balance) || 0) - amountVal;
      postTransaction(
        `${student.name} - Payment: ${ui.paymentDescription}`, 
        ui.ref || `OR-${Date.now().toString().slice(-4)}`,
        [{ accountId: '1', debit: amountVal, credit: 0 }, { accountId: '2', debit: 0, credit: amountVal }],
        'Cashiering', 
        { studentId: student.id }
      );
      ui.showPayment = false; 
      ui.amount = 0;
      ui.paymentDescription = 'Tuition';
      ui.ref = '';
    };

    const closeAllModals = () => {
      ui.showCharge = false; 
      ui.showPayment = false; 
      ui.showAddStudent = false; 
      ui.showSOA = false;
      ui.showManageTemplates = false; 
      ui.showCreateTemplate = false; 
      ui.showApplyTemplateBatch = false;
      ui.showConfirmDialog = false;
      ui.targetIndividualId = '';
    };

    return { 
      state, ui, summary, collectionsToday, postPayment, assessFee, addStudent, 
      addTemplate, initiateTemplateAction, confirmAndPost, toggleStudentSelection, 
      toggleSelectAllVisible, filteredStudents, studentLedger, selectedStudent, closeAllModals 
    };
  },
  render() {
    return h('div', { class: 'animate-fade space-y-10 pb-32' }, [
      
      // DASHBOARD STAT CARDS
      h('div', { class: 'grid grid-cols-3 gap-6' }, [
        h('div', { class: 'premium-card p-10 border-l-8 border-rose-500' }, [
          h('p', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest' }, 'Total AR'),
          h('p', { class: 'text-4xl font-black text-slate-800 mt-3' }, `₱${this.summary.totalAR.toLocaleString()}`)
        ]),
        h('div', { class: 'premium-card p-10 border-l-8 border-emerald-500' }, [
          h('p', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest' }, 'Daily Collections'),
          h('p', { class: 'text-4xl font-black text-emerald-600 mt-3' }, `₱${this.collectionsToday.toLocaleString()}`)
        ]),
        h('div', { class: 'premium-card p-10 border-l-8 border-slate-900' }, [
          h('p', { class: 'text-[10px] font-black text-slate-400 uppercase tracking-widest' }, 'Total Enrollment'),
          h('p', { class: 'text-4xl font-black text-slate-800 mt-3' }, this.state.students.length)
        ])
      ]),

      // REGISTRY TABLE
      h('div', { class: 'premium-card overflow-hidden shadow-2xl relative' }, [
        h('div', { class: 'p-10 border-b flex justify-between items-center bg-slate-50/30' }, [
          h('div', { class: 'flex items-center gap-6' }, [
            h('h3', { class: 'text-2xl font-black text-slate-800' }, 'Student Registry'),
            h('input', { 
              value: this.ui.studentSearch,
              onInput: e => this.ui.studentSearch = e.target.value,
              placeholder: 'Search name or level...',
              class: 'px-6 py-4 rounded-2xl bg-white border border-slate-200 font-bold text-sm w-80'
            })
          ]),
          h('div', { class: 'flex gap-4' }, [
            h('button', { onClick: () => this.ui.showManageTemplates = true, class: 'bg-white border-2 border-emerald-100 text-emerald-600 px-8 py-4 rounded-2xl font-black text-xs hover:bg-emerald-50' }, 'TEMPLATES'),
            h('button', { onClick: () => this.ui.showAddStudent = true, class: 'bg-white border-2 border-slate-100 text-slate-600 px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-50' }, '+ ENROLL'),
            h('button', { onClick: () => this.ui.showCharge = true, class: 'bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs shadow-md' }, 'ASSESS FEE'),
            h('button', { onClick: () => this.ui.showPayment = true, class: 'green-gradient text-white px-8 py-4 rounded-2xl font-black text-xs shadow-lg' }, 'POST PAYMENT')
          ])
        ]),

        h('table', { class: 'w-full text-left' }, [
          h('thead', { class: 'bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest' }, [
            h('tr', [
              h('th', { class: 'px-10 py-6 w-16' }, [
                h('input', { 
                  type: 'checkbox', 
                  checked: this.ui.selectedRegistryIds.length === this.filteredStudents.length && this.filteredStudents.length > 0,
                  onChange: this.toggleSelectAllVisible,
                  class: 'w-5 h-5 accent-emerald-600 cursor-pointer'
                })
              ]),
              h('th', { class: 'px-6 py-6' }, 'Student Name'),
              h('th', { class: 'px-6 py-6' }, 'Level'),
              h('th', { class: 'px-6 py-6 text-right' }, 'Balance'),
              h('th', { class: 'px-10 py-6 text-center' }, 'Actions')
            ])
          ]),
          h('tbody', { class: 'divide-y divide-slate-100' }, this.filteredStudents.map(s => 
            h('tr', { 
              class: `transition-colors ${this.ui.selectedRegistryIds.includes(s.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}` 
            }, [
              h('td', { class: 'px-10 py-6' }, [
                h('input', { 
                  type: 'checkbox', 
                  checked: this.ui.selectedRegistryIds.includes(s.id),
                  onChange: () => this.toggleStudentSelection(s.id),
                  class: 'w-5 h-5 accent-emerald-600 cursor-pointer'
                })
              ]),
              h('td', { class: 'px-6 py-8 font-black text-xl text-slate-800' }, s.name),
              h('td', { class: 'px-6 py-8 text-slate-400 font-bold text-sm' }, s.grade),
              h('td', { class: `px-6 py-8 text-right font-black text-2xl ${s.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}` }, `₱${Number(s.balance).toLocaleString()}`),
              h('td', { class: 'px-10 py-8 text-center' }, [
                h('div', { class: 'flex items-center justify-center gap-4' }, [
                  h('button', { 
                    onClick: () => { this.ui.targetIndividualId = s.id; this.ui.showApplyTemplateBatch = true; },
                    class: 'text-[9px] font-black text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg hover:bg-emerald-50' 
                  }, 'Template'),
                  h('button', { 
                    onClick: () => { this.ui.selectedStudentId = s.id; this.ui.showSOA = true; },
                    class: 'text-[9px] font-black text-slate-400 hover:text-slate-900' 
                  }, 'Ledger')
                ])
              ])
            ])
          ))
        ]),

        // BATCH TOOLBAR
        this.ui.selectedRegistryIds.length > 0 ? h('div', { 
          class: 'fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-900 px-12 py-8 rounded-[3rem] shadow-2xl flex items-center gap-12 border border-white/10 z-[100] animate-fade' 
        }, [
          h('div', [
            h('p', { class: 'text-emerald-400 font-black text-xs uppercase' }, 'Batch Mode'),
            h('h4', { class: 'text-white font-black text-2xl' }, `${this.ui.selectedRegistryIds.length} Selected`)
          ]),
          h('div', { class: 'flex gap-4' }, [
            h('button', { onClick: () => this.ui.selectedRegistryIds = [], class: 'px-6 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-red-700' }, 'DISCARD'),
            h('button', { onClick: () => { this.ui.targetIndividualId = ''; this.ui.showApplyTemplateBatch = true; }, class: 'green-gradient text-white px-10 py-4 rounded-2xl font-black text-xs shadow-lg uppercase' }, 'APPLY BATCH')
          ])
        ]) : null
      ]),

      // --- MODALS ---

      // TEMPLATE SELECTOR
      this.ui.showApplyTemplateBatch ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-3xl shadow-2xl relative animate-fade' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-10 right-10 text-black font-black text-xl' }, '✕'),
          h('h3', { class: 'text-4xl font-black text-slate-900 mb-2' }, 'Institutional Billing'),
          h('p', { class: 'text-slate-400 font-bold mb-12' }, 
            this.ui.targetIndividualId 
            ? `Applying for: ${this.selectedStudent?.name}` 
            : `Applying to group: ${this.ui.selectedRegistryIds.length} students.`
          ),
          h('div', { class: 'grid grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2' }, this.state.feeTemplates.map(t => 
            h('button', { 
              type: 'button',
              onClick: () => this.initiateTemplateAction(t.id),
              class: 'p-10 bg-slate-50 border border-slate-100 hover:border-emerald-500 rounded-[3rem] text-left transition-all hover:bg-emerald-50 flex flex-col group relative'
            }, [
              h('p', { class: 'text-[10px] font-black text-emerald-600 uppercase mb-4' }, t.gradeLevel),
              h('h4', { class: 'text-2xl font-black text-slate-800 mb-6' }, t.name),
              h('div', { class: 'mt-auto pt-6 border-t border-slate-200 flex justify-between items-baseline w-full' }, [
                h('p', { class: 'text-3xl font-black text-slate-900 group-hover:text-emerald-700' }, `₱${t.items.reduce((s,i)=>s+Number(i.amount),0).toLocaleString()}`),
                h('p', { class: 'text-[10px] font-black text-slate-300 uppercase' }, 'Select')
              ])
            ])
          )),
          h('button', { onClick: this.closeAllModals, class: 'w-full py-6 bg-slate-100 text-slate-400 rounded-3xl font-black mt-12' }, 'CANCEL')
        ])
      ]) : null,

      // CREATE TEMPLATE MODAL (REDESIGNED TO MATCH SCREENSHOT)
      this.ui.showCreateTemplate ? h('div', { class: 'fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-3xl shadow-2xl relative animate-fade' }, [
          h('button', { onClick: () => this.ui.showCreateTemplate = false, class: 'absolute top-10 right-10 text-slate-900 font-black text-xl hover:opacity-50 transition' }, '✕'),
          
          h('h3', { class: 'text-5xl font-black text-slate-900 mb-16' }, 'New Fee Template'),
          
          h('div', { class: 'grid grid-cols-2 gap-10 mb-10' }, [
            h('div', [
              h('label', { class: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3' }, 'Template Name'),
              h('input', { 
                value: this.ui.templateName, 
                onInput: e => this.ui.templateName = e.target.value,
                placeholder: 'e.g. Grade 10 Full Package', 
                class: 'w-full px-6 py-5 rounded-2xl font-bold bg-slate-50 border border-slate-100 focus:bg-white' 
              })
            ]),
            h('div', [
              h('label', { class: 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3' }, 'Target Grade Level'),
              h('input', { 
                value: this.ui.templateGrade, 
                onInput: e => this.ui.templateGrade = e.target.value,
                placeholder: 'e.g. Grade 10', 
                class: 'w-full px-6 py-5 rounded-2xl font-bold bg-slate-50 border border-slate-100 focus:bg-white' 
              })
            ])
          ]),

          h('div', { class: 'border-t border-slate-100 pt-10 mb-10' }, [
            h('div', { class: 'flex justify-between items-center mb-8' }, [
              h('h4', { class: 'text-2xl font-black text-slate-800' }, 'Fee Breakdown'),
              h('button', { 
                onClick: () => this.ui.templateLines.push({ category: 'Tuition', amount: 0 }),
                class: 'text-emerald-600 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-emerald-700' 
              }, '+ ADD LINE')
            ]),

            h('div', { class: 'space-y-4 max-h-[300px] overflow-y-auto pr-4 scrollbar-hide' }, this.ui.templateLines.map((line, idx) => 
              h('div', { key: idx, class: 'grid grid-cols-12 gap-6 items-center' }, [
                h('select', { 
                  value: line.category, 
                  onChange: e => line.category = e.target.value,
                  class: 'col-span-6 px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-slate-700' 
                }, this.state.feeCategories.map(cat => h('option', { value: cat }, cat))),
                h('div', { class: 'col-span-4 relative' }, [
                  h('input', { 
                    type: 'number', 
                    value: line.amount, 
                    onInput: e => line.amount = e.target.value, 
                    class: 'w-full px-6 py-5 rounded-2xl bg-slate-50 border border-slate-100 font-black text-right text-slate-800 focus:bg-white' 
                  })
                ]),
                h('button', { 
                  onClick: () => this.ui.templateLines.splice(idx, 1), 
                  class: 'col-span-2 text-rose-500 font-black text-[10px] uppercase tracking-widest hover:text-rose-700 text-center' 
                }, 'REMOVE')
              ])
            ))
          ]),

          h('div', { class: 'flex gap-6 mt-16' }, [
            h('button', { 
              onClick: () => this.ui.showCreateTemplate = false, 
              class: 'flex-1 py-7 bg-slate-50 text-slate-500 rounded-3xl font-black text-base hover:bg-slate-100 transition' 
            }, 'CANCEL'),
            h('button', { 
              onClick: this.addTemplate, 
              class: 'flex-[2] py-7 green-gradient text-white rounded-3xl font-black text-base shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition' 
            }, 'SAVE TEMPLATE')
          ])
        ])
      ]) : null,

      // OTHER MODALS...
      this.ui.showConfirmDialog ? h('div', { class: 'fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[150] p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-xl shadow-2xl relative animate-fade text-center' }, [
          h('h3', { class: 'text-3xl font-black text-slate-900 mb-6' }, 'Confirm Ledger Posting'),
          h('div', { class: 'bg-emerald-50 p-8 rounded-3xl mb-10' }, [
            h('p', { class: 'text-slate-500 font-bold' }, 'Transaction Details'),
            h('h4', { class: 'text-2xl font-black text-slate-800 mt-2' }, this.ui.pendingTemplate?.name),
            h('p', { class: 'text-3xl font-black text-emerald-600 mt-4' }, `₱${this.ui.pendingTemplate?.items.reduce((s,i)=>s+Number(i.amount),0).toLocaleString()}`),
            h('p', { class: 'text-xs font-black text-slate-400 uppercase mt-4 tracking-widest' }, `Apply to ${this.ui.pendingTargets.length} profile(s)`)
          ]),
          h('p', { class: 'text-slate-400 font-medium mb-10 leading-relaxed' }, 'This action will update the student balance and post a double-entry journal record in the General Ledger. This cannot be undone automatically.'),
          h('div', { class: 'flex gap-4' }, [
            h('button', { onClick: () => this.ui.showConfirmDialog = false, class: 'flex-1 py-6 bg-slate-100 text-slate-500 rounded-3xl font-black' }, 'BACK'),
            h('button', { onClick: this.confirmAndPost, class: 'flex-[2] py-6 green-gradient text-white rounded-3xl font-black text-xl shadow-xl' }, 'CONFIRM & POST')
          ])
        ])
      ]) : null,

      this.ui.showAddStudent ? h('div', { class: 'fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[3.5rem] w-full max-w-lg shadow-2xl relative animate-fade' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-3xl font-black mb-10' }, 'Enroll New Student'),
          h('div', { class: 'space-y-6' }, [
            h('input', { value: this.ui.newStudentName, onInput: e => this.ui.newStudentName = e.target.value, placeholder: 'Full Name', class: 'w-full p-5 rounded-2xl font-bold' }),
            h('input', { value: this.ui.newStudentGrade, onInput: e => this.ui.newStudentGrade = e.target.value, placeholder: 'Grade Level', class: 'w-full p-5 rounded-2xl font-bold' }),
            h('button', { onClick: this.addStudent, class: 'w-full py-6 green-gradient text-white rounded-2xl font-black text-lg' }, 'SAVE PROFILE')
          ])
        ])
      ]) : null,

      this.ui.showSOA ? h('div', { class: 'fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-10' }, [
        h('div', { class: 'bg-white p-20 rounded-[5rem] w-full max-w-5xl shadow-2xl relative flex flex-col max-h-[90vh]' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-12 right-12 text-black font-black' }, '✕'),
          h('h3', { class: 'text-5xl font-black mb-2' }, this.selectedStudent?.name),
          h('p', { class: 'text-emerald-600 font-black mb-12 uppercase' }, this.selectedStudent?.grade),
          h('div', { class: 'flex-1 overflow-y-auto pr-8' }, [
            h('table', { class: 'w-full' }, [
              h('thead', { class: 'text-[10px] font-black text-slate-300 uppercase border-b pb-4' }, [
                h('tr', [h('th', { class: 'text-left pb-4' }, 'Date'), h('th', { class: 'text-left pb-4' }, 'Description'), h('th', { class: 'text-right pb-4' }, 'Debit'), h('th', { class: 'text-right pb-4' }, 'Credit')])
              ]),
              h('tbody', { class: 'divide-y' }, this.studentLedger.map(e => 
                h('tr', [
                  h('td', { class: 'py-8 text-slate-400 font-bold' }, e.date),
                  h('td', { class: 'py-8 font-black' }, e.description),
                  h('td', { class: 'py-8 text-right text-rose-500 font-black' }, e.lines[0].debit > 0 ? `₱${Number(e.lines[0].debit).toLocaleString()}` : '-'),
                  h('td', { class: 'py-8 text-right text-emerald-600 font-black' }, e.lines[0].credit > 0 ? `₱${Number(e.lines[0].credit).toLocaleString()}` : '-')
                ])
              ))
            ])
          ]),
          h('div', { class: 'mt-12 pt-12 border-t flex gap-6' }, [
            h('button', { onClick: () => { this.ui.studentId = this.ui.selectedStudentId; this.ui.showSOA = false; this.ui.showPayment = true; }, class: 'flex-1 py-8 green-gradient text-white rounded-[3rem] font-black text-xl' }, 'PROCESS COLLECTION'),
            h('button', { onClick: window.print, class: 'px-14 py-8 border-2 text-slate-400 rounded-[3rem] font-black uppercase text-xs' }, 'Print Statement')
          ])
        ])
      ]) : null,

      this.ui.showManageTemplates ? h('div', { class: 'fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-6xl shadow-2xl relative flex flex-col max-h-[90vh]' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('div', { class: 'flex justify-between items-center mb-12 shrink-0' }, [
            h('h3', { class: 'text-4xl font-black text-slate-800' }, 'Fee Templates'),
            h('button', { onClick: () => this.ui.showCreateTemplate = true, class: 'green-gradient text-white px-10 py-5 rounded-3xl font-black text-sm' }, '+ NEW')
          ]),
          h('div', { class: 'grid grid-cols-2 gap-8 overflow-y-auto' }, this.state.feeTemplates.map(t => 
            h('div', { class: 'p-12 bg-slate-50 rounded-[3rem] border flex flex-col hover:border-emerald-200 transition' }, [
              h('h4', { class: 'text-3xl font-black text-slate-800' }, t.name),
              h('p', { class: 'text-sm font-black text-emerald-600 uppercase mb-10 tracking-widest' }, t.gradeLevel),
              h('div', { class: 'space-y-4 mb-12 flex-1' }, t.items.map(i => 
                h('div', { class: 'flex justify-between' }, [
                  h('span', { class: 'text-slate-400 font-bold' }, i.category),
                  h('span', { class: 'text-slate-900 font-black' }, `₱${Number(i.amount).toLocaleString()}`)
                ])
              )),
              h('button', { onClick: () => { this.ui.showManageTemplates = false; this.ui.showApplyTemplateBatch = true; }, class: 'green-gradient text-white px-10 py-5 rounded-3xl font-black text-xs shadow-lg' }, 'APPLY TEMPLATE')
            ])
          ))
        ])
      ]) : null,

      this.ui.showCharge ? h('div', { class: 'fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-2xl shadow-2xl relative scrollbar-hide overflow-y-auto max-h-[95vh]' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-4xl font-black mb-12' }, 'Direct Charge'),
          h('div', { class: 'space-y-6' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Target Student'),
              h('select', { value: this.ui.studentId, onChange: e => this.ui.studentId = e.target.value, class: 'w-full p-5 rounded-2xl font-bold bg-slate-50' }, [h('option', { value: '' }, 'Select Student...'), ...this.state.students.map(s => h('option', { value: s.id }, s.name))])
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Assessment Particulars'),
              h('input', { value: this.ui.description, onInput: e => this.ui.description = e.target.value, placeholder: 'e.g. Lab Fee, Uniform', class: 'w-full p-5 rounded-2xl font-bold' })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Amount (₱)'),
              h('input', { type: 'number', value: this.ui.amount, onInput: e => this.ui.amount = e.target.value, class: 'w-full p-8 rounded-[2rem] font-black text-6xl text-rose-500 text-center shadow-inner' })
            ]),
            h('button', { onClick: this.assessFee, class: 'w-full py-8 green-gradient text-white rounded-[2.5rem] font-black text-xl shadow-xl' }, 'POST CHARGE')
          ])
        ])
      ]) : null,

      this.ui.showPayment ? h('div', { class: 'fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-6' }, [
        h('div', { class: 'bg-white p-16 rounded-[4rem] w-full max-w-2xl shadow-2xl relative scrollbar-hide overflow-y-auto max-h-[95vh]' }, [
          h('button', { onClick: this.closeAllModals, class: 'absolute top-10 right-10 text-black font-black' }, '✕'),
          h('h3', { class: 'text-4xl font-black mb-12' }, 'Collection'),
          h('div', { class: 'space-y-6' }, [
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Payer'),
              h('select', { value: this.ui.studentId, onChange: e => this.ui.studentId = e.target.value, class: 'w-full p-5 rounded-2xl font-bold bg-slate-50' }, [h('option', { value: '' }, 'Select Student...'), ...this.state.students.map(s => h('option', { value: s.id }, s.name))])
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Payment Particulars'),
              h('input', { value: this.ui.paymentDescription, onInput: e => this.ui.paymentDescription = e.target.value, placeholder: 'e.g. Tuition Payment', class: 'w-full p-5 rounded-2xl font-bold' })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Reference / OR Number'),
              h('input', { value: this.ui.ref, onInput: e => this.ui.ref = e.target.value, placeholder: 'OR-0000', class: 'w-full p-5 rounded-2xl font-bold' })
            ]),
            h('div', [
              h('label', { class: 'block text-xs font-black text-slate-400 uppercase mb-2' }, 'Amount (₱)'),
              h('input', { type: 'number', value: this.ui.amount, onInput: e => this.ui.amount = e.target.value, class: 'w-full p-8 rounded-[2rem] font-black text-6xl text-emerald-600 text-center shadow-inner' })
            ]),
            h('button', { onClick: this.postPayment, class: 'w-full py-8 green-gradient text-white rounded-[2.5rem] font-black text-xl shadow-xl' }, 'APPROVE RECEIPT')
          ])
        ])
      ]) : null
    ]);
  }
});
