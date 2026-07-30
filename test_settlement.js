import { calculateSettlement } from './src/utils/settlement.js';

// Test Scenario described by user:
// Member A, B, C, D (All Adults)
const members = [
  { id: 'm_A', name: 'A', type: 'adult', spouseId: null, parentId: null },
  { id: 'm_B', name: 'B', type: 'adult', spouseId: null, parentId: null },
  { id: 'm_C', name: 'C', type: 'adult', spouseId: null, parentId: null },
  { id: 'm_D', name: 'D', type: 'adult', spouseId: null, parentId: null },
];

// Expense 1: B paid 100 for A
const exp1 = {
  id: 'e1',
  title: 'B 幫 A 代付 100',
  amount: 100,
  payerId: 'm_B',
  beneficiaryIds: ['m_A'],
  splitType: 'equal',
  customShares: {}
};

// Expense 2: B paid 200 for C and D (100 each)
const exp2 = {
  id: 'e2',
  title: 'B 幫 C 和 D 代付 200',
  amount: 200,
  payerId: 'm_B',
  beneficiaryIds: ['m_C', 'm_D'],
  splitType: 'equal',
  customShares: {}
};

const res = calculateSettlement(members, [exp1, exp2]);
console.log('Total Amount:', res.totalAmount);
console.log('Transfers:', res.transfers);
