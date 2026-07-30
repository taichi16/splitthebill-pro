import { calculateSettlement } from './settlement';

/**
 * Sends a structured JSON payload to the user's Google Apps Script Web App URL.
 * @param {string} gasUrl - The GAS Web App endpoint URL.
 * @param {string} tripName - The trip name.
 * @param {Array} members - The members array.
 * @param {Array} expenses - The expenses array.
 * @returns {Promise<boolean>} - Returns true if the backup request was successfully dispatched.
 */
export async function backupToGoogleSheets(gasUrl, tripName, members, expenses) {
  if (!gasUrl || !gasUrl.startsWith('http')) {
    throw new Error('請提供有效的 Google Apps Script API 網址！');
  }

  const settlement = calculateSettlement(members, expenses);
  
  const payload = {
    tripName: tripName || '多人記帳拆帳 專業版',
    backupTime: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
    members: members.map(m => ({
      name: m.name,
      type: m.type === 'adult' ? '大人' : '小孩',
      spouse: m.spouseId ? (members.find(x => x.id === m.spouseId)?.name || '') : '',
      parent: m.parentId ? (members.find(x => x.id === m.parentId)?.name || '') : ''
    })),
    expenses: expenses.map(e => ({
      title: e.title,
      category: translateCategory(e.category),
      amount: e.amount,
      payer: members.find(m => m.id === e.payerId)?.name || '未知',
      date: e.date,
      notes: e.notes || '',
      splitType: translateSplitType(e.splitType),
      beneficiaries: (e.beneficiaryIds || []).map(id => members.find(m => m.id === id)?.name || '').join('、')
    })),
    households: Object.values(settlement.householdConsolidated || {}).map(hh => {
      let displayName = hh.primaryAdult.name;
      if (hh.isCouple && hh.adults.length > 1) {
        displayName += ` & ${hh.adults[1].name} (夫妻)`;
      }
      if (hh.children && hh.children.length > 0) {
        const cNames = hh.children.map(c => c.name).join('、');
        displayName += ` (含 ${cNames})`;
      }
      return {
        name: displayName,
        paid: hh.totalPaid,
        cost: hh.totalCost,
        net: hh.totalNet
      };
    }),
    transfers: (settlement.transfers || []).map(t => ({
      from: t.fromName,
      to: t.toName,
      amount: t.amount
    }))
  };

  // We use text/plain for the Content-Type header to avoid CORS preflight options check,
  // as Google Apps Script redirecting can sometimes trigger CORS errors on the preflight check.
  // The GAS doGet/doPost receives the request body as e.postData.contents and can parse it.
  const response = await fetch(gasUrl, {
    method: 'POST',
    mode: 'no-cors', // Dispatches the request in background securely, ignores redirect CORS issues.
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });

  return true;
}

function translateCategory(cat) {
  const map = {
    dining: '餐飲美食',
    transport: '交通油資',
    lodging: '飯店住宿',
    entertainment: '景點娛樂',
    shopping: '購物消費',
    other: '其他雜項'
  };
  return map[cat] || cat;
}

function translateSplitType(type) {
  const map = {
    equal: '全員均分',
    child_fixed: '小孩固定金額 + 大人平分',
    weighted: '權重拆帳',
    custom: '全員自訂金額'
  };
  return map[type] || type;
}

/**
 * Return the Google Apps Script template code to be shown to the user.
 * This script handles creating/formatting worksheets and inserting rows.
 */
export function getGAppsScriptCode() {
  return `/* 
  多人記帳拆帳 專業版 - Google Apps Script 備份接收程式碼
  使用步驟：
  1. 到 Google 雲端硬碟建立一個新的「Google 試算表」。
  2. 在選單列點擊「擴充功能」 -> 「Apps Script」。
  3. 刪除原本所有程式碼，將此段程式碼全部複製貼上。
  4. 點擊 Apps Script 視窗上方的「部署」 -> 「新增部署」。
  5. 類型選擇「網頁應用程式」。
  6. 設定「限本人存取」為「任何人」（Anyone）。
  7. 點擊「部署」，並授予必要的帳戶權限。
  8. 複製產生的「網頁應用程式網址 (URL)」，並將其貼回記帳 App 設定中。
*/

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 建立或重新建立工作表
    writeTripNameAndMeta(ss, data.tripName, data.backupTime);
    writeMembersSheet(ss, data.members);
    writeExpensesSheet(ss, data.expenses);
    writeSettlementSheet(ss, data.households, data.transfers);
    
    return ContentService.createTextOutput("Backup Success")
                         .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return ContentService.createTextOutput("Backup Error: " + error.toString())
                         .setMimeType(ContentService.MimeType.TEXT);
  }
}

function writeTripNameAndMeta(ss, tripName, backupTime) {
  var sheet = ss.getSheetByName("行程基本資訊") || ss.insertSheet("行程基本資訊");
  sheet.clear();
  
  sheet.getRange(1, 1).setValue("行程/活動名稱").setFontWeight("bold");
  sheet.getRange(1, 2).setValue(tripName);
  sheet.getRange(2, 1).setValue("上次備份時間").setFontWeight("bold");
  sheet.getRange(2, 2).setValue(backupTime);
  
  sheet.autoResizeColumns(1, 2);
}

function writeMembersSheet(ss, members) {
  var sheet = ss.getSheetByName("1.成員清單") || ss.insertSheet("1.成員清單");
  sheet.clear();
  
  var headers = ["成員姓名", "類型", "配偶關聯", "父母關聯"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  
  for (var i = 0; i < members.length; i++) {
    sheet.appendRow([
      members[i].name,
      members[i].type,
      members[i].spouse,
      members[i].parent
    ]);
  }
  sheet.autoResizeColumns(1, headers.length);
}

function writeExpensesSheet(ss, expenses) {
  var sheet = ss.getSheetByName("2.消費明細") || ss.insertSheet("2.消費明細");
  sheet.clear();
  
  var headers = ["消費日期", "品項/店家", "消費類別", "總金額", "代付人", "分攤模式", "參與成員"];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e2e8f0");
  
  for (var i = 0; i < expenses.length; i++) {
    sheet.appendRow([
      expenses[i].date,
      expenses[i].title,
      expenses[i].category,
      expenses[i].amount,
      expenses[i].payer,
      expenses[i].splitType,
      expenses[i].beneficiaries
    ]);
  }
  
  // 將金額欄格式化為貨幣
  if (expenses.length > 0) {
    sheet.getRange(2, 4, expenses.length, 1).setNumberFormat("$#,##0");
  }
  sheet.autoResizeColumns(1, headers.length);
}

function writeSettlementSheet(ss, households, transfers) {
  var sheet = ss.getSheetByName("3.結算與轉帳") || ss.insertSheet("3.結算與轉帳");
  sheet.clear();
  
  // 家庭收支統計
  sheet.getRange(1, 1).setValue("家庭/戶頭收支統計").setFontWeight("bold").setFontSize(11);
  var hhHeaders = ["家庭名稱/成員", "代付總額", "消費總額", "淨收支 (正值應收 / 負值應付)"];
  sheet.getRange(2, 1, 1, hhHeaders.length).setValues([hhHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  
  var startRow = 3;
  for (var i = 0; i < households.length; i++) {
    sheet.getRange(startRow + i, 1, 1, hhHeaders.length).setValues([[
      households[i].name,
      households[i].paid,
      households[i].cost,
      households[i].net
    ]]);
  }
  
  var numHh = households.length;
  if (numHh > 0) {
    sheet.getRange(3, 2, numHh, 3).setNumberFormat("$#,##0");
  }
  
  // 轉帳清償方案
  var transferTitleRow = startRow + numHh + 2;
  sheet.getRange(transferTitleRow, 1).setValue("按代付者直連轉帳清償方案").setFontWeight("bold").setFontSize(11);
  
  var transHeaders = ["匯出人 (誰付款)", "匯入人 (匯給誰)", "轉帳金額"];
  var transHeaderRow = transferTitleRow + 1;
  sheet.getRange(transHeaderRow, 1, 1, transHeaders.length).setValues([transHeaders]).setFontWeight("bold").setBackground("#cbd5e1");
  
  var transStartRow = transHeaderRow + 1;
  if (transfers.length === 0) {
    sheet.getRange(transStartRow, 1).setValue("所有人帳務均已完美平衡，無需轉帳！").setFontStyle("italic");
  } else {
    for (var j = 0; j < transfers.length; j++) {
      sheet.getRange(transStartRow + j, 1, 1, transHeaders.length).setValues([[
        transfers[j].from,
        transfers[j].to,
        transfers[j].amount
      ]]);
    }
    sheet.getRange(transStartRow, 3, transfers.length, 1).setNumberFormat("$#,##0");
  }
  
  sheet.autoResizeColumns(1, 4);
}
`;
}
