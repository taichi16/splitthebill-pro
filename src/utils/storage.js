// Default initial data for family & group bill splitting
export const DEFAULT_TRIP_NAME = '墾丁親子三日遊';

export const DEFAULT_MEMBERS = [
  { id: 'm_1', name: '陳大明', type: 'adult', spouseId: 'm_2', parentId: null, color: '#3b82f6' },
  { id: 'm_2', name: '林美玲', type: 'adult', spouseId: 'm_1', parentId: null, color: '#ec4899' },
  { id: 'm_3', name: '黃志偉', type: 'adult', spouseId: null, parentId: null, color: '#10b981' },
  { id: 'm_4', name: '陳小明', type: 'child', spouseId: null, parentId: 'm_1', color: '#60a5fa' },
  { id: 'm_5', name: '陳小華', type: 'child', spouseId: null, parentId: 'm_1', color: '#93c5fd' },
  { id: 'm_6', name: '林小晴', type: 'child', spouseId: null, parentId: 'm_2', color: '#f472b6' },
];

export const DEFAULT_EXPENSES = [
  {
    id: 'e_1',
    title: '墾丁海鮮餐廳合菜晚餐',
    category: 'dining',
    amount: 3600,
    payerId: 'm_1', // 陳大明代付 (代表陳大明&林美玲夫妻檔)
    beneficiaryIds: ['m_1', 'm_2', 'm_3', 'm_4', 'm_5', 'm_6'],
    splitType: 'child_fixed',
    customShares: {
      m_4: 200, m_5: 200, m_6: 200
    },
    date: new Date().toISOString().split('T')[0],
    notes: '大明代付整桌晚餐，小朋友各算$200，大人平分剩餘金額'
  },
  {
    id: 'e_2',
    title: '海邊水上活動雙人卡丁車',
    category: 'entertainment',
    amount: 1600,
    payerId: 'm_2', // 林美玲代付
    beneficiaryIds: ['m_1', 'm_2', 'm_4', 'm_5', 'm_6'],
    splitType: 'equal',
    customShares: {},
    date: new Date().toISOString().split('T')[0],
    notes: '美玲代付卡丁車門票'
  },
  {
    id: 'e_3',
    title: '獨棟海景民宿 (兩晚總價)',
    category: 'lodging',
    amount: 9000,
    payerId: 'm_3', // 黃志偉代付
    beneficiaryIds: ['m_1', 'm_2', 'm_3', 'm_4', 'm_5', 'm_6'],
    splitType: 'child_fixed',
    customShares: {
      m_4: 500, m_5: 500, m_6: 500
    },
    date: new Date().toISOString().split('T')[0],
    notes: '志偉哥刷卡代付住宿，小孩收不佔床清潔費'
  },
  {
    id: 'e_4',
    title: '超商飲料零食補充包',
    category: 'shopping',
    amount: 450,
    payerId: 'm_1', // 陳大明
    beneficiaryIds: ['m_4', 'm_5', 'm_6'],
    splitType: 'equal',
    customShares: {},
    date: new Date().toISOString().split('T')[0],
    notes: '幫所有小朋友買飲料零食'
  }
];

const STORAGE_KEY_TRIP_NAME = 'family_bill_trip_name_v3';
const STORAGE_KEY_MEMBERS = 'family_bill_members_v3';
const STORAGE_KEY_EXPENSES = 'family_bill_expenses_v3';

export function loadStoredTripName() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRIP_NAME);
    if (!raw) return DEFAULT_TRIP_NAME;
    return raw;
  } catch (e) {
    return DEFAULT_TRIP_NAME;
  }
}

export function saveStoredTripName(name) {
  try {
    localStorage.setItem(STORAGE_KEY_TRIP_NAME, name);
  } catch (e) {}
}

export function loadStoredMembers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MEMBERS);
    if (!raw) return DEFAULT_MEMBERS;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored members', e);
    return DEFAULT_MEMBERS;
  }
}

export function saveStoredMembers(members) {
  try {
    localStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
  } catch (e) {
    console.error('Failed to save members', e);
  }
}

export function loadStoredExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES);
    if (!raw) return DEFAULT_EXPENSES;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load stored expenses', e);
    return DEFAULT_EXPENSES;
  }
}

export function saveStoredExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses', e);
  }
}

export function resetToDefaultData() {
  saveStoredTripName(DEFAULT_TRIP_NAME);
  saveStoredMembers(DEFAULT_MEMBERS);
  saveStoredExpenses(DEFAULT_EXPENSES);
  return { tripName: DEFAULT_TRIP_NAME, members: DEFAULT_MEMBERS, expenses: DEFAULT_EXPENSES };
}

export function clearAllData() {
  saveStoredTripName('');
  saveStoredMembers([]);
  saveStoredExpenses([]);
  return { tripName: '', members: [], expenses: [] };
}
