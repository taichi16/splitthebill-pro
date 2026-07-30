/**
 * Settlement engine enforcing "Direct Payer Reimbursement" (誰幫我刷卡，我就直接還給誰).
 * Consolidates couple/family households so children and spouses pay/receive as a single unit,
 * while maintaining strict transaction-payer attribution.
 */

export function calculateSettlement(members, expenses) {
  if (!members || members.length === 0) {
    return {
      totalAmount: 0,
      individualBalances: {},
      householdConsolidated: {},
      transfers: [],
      memberMap: {}
    };
  }

  const memberMap = {};
  members.forEach(m => {
    memberMap[m.id] = m;
  });

  let totalAmount = 0;
  const totalPaid = {};
  const totalCost = {};

  members.forEach(m => {
    totalPaid[m.id] = 0;
    totalCost[m.id] = 0;
  });

  // 1. Process all expenses and calculate per-expense shares
  const expenseSharesList = [];

  expenses.forEach(exp => {
    const amount = Number(exp.amount) || 0;
    totalAmount += amount;

    // Credit payer
    if (exp.payerId && totalPaid[exp.payerId] !== undefined) {
      totalPaid[exp.payerId] += amount;
    }

    const beneficiaries = exp.beneficiaryIds || [];
    if (beneficiaries.length === 0) return;

    const adultsInExp = beneficiaries.filter(id => memberMap[id]?.type === 'adult');
    const childrenInExp = beneficiaries.filter(id => memberMap[id]?.type === 'child');
    const expShares = {};

    if (exp.splitType === 'equal') {
      const perHead = amount / beneficiaries.length;
      beneficiaries.forEach(id => {
        if (totalCost[id] !== undefined) totalCost[id] += perHead;
        expShares[id] = perHead;
      });
    } else if (exp.splitType === 'child_fixed') {
      let childrenTotalSum = 0;
      childrenInExp.forEach(cId => {
        const fixedAmt = exp.customShares?.[cId] !== undefined ? Number(exp.customShares[cId]) : 200;
        childrenTotalSum += fixedAmt;
        if (totalCost[cId] !== undefined) totalCost[cId] += fixedAmt;
        expShares[cId] = fixedAmt;
      });

      const remainingAmountForAdults = Math.max(0, amount - childrenTotalSum);
      const adultShare = adultsInExp.length > 0 ? remainingAmountForAdults / adultsInExp.length : 0;

      adultsInExp.forEach(aId => {
        if (totalCost[aId] !== undefined) totalCost[aId] += adultShare;
        expShares[aId] = adultShare;
      });
    } else if (exp.splitType === 'weighted') {
      let totalWeight = 0;
      beneficiaries.forEach(id => {
        const member = memberMap[id];
        const customW = exp.customShares && exp.customShares[id];
        let weight = customW !== undefined ? Number(customW) : (member?.type === 'child' ? 0.5 : 1.0);
        totalWeight += weight;
      });

      if (totalWeight > 0) {
        beneficiaries.forEach(id => {
          const member = memberMap[id];
          const customW = exp.customShares && exp.customShares[id];
          let weight = customW !== undefined ? Number(customW) : (member?.type === 'child' ? 0.5 : 1.0);
          const share = amount * (weight / totalWeight);
          if (totalCost[id] !== undefined) totalCost[id] += share;
          expShares[id] = share;
        });
      }
    } else if (exp.splitType === 'custom') {
      beneficiaries.forEach(id => {
        const share = Number(exp.customShares?.[id] || 0);
        if (totalCost[id] !== undefined) totalCost[id] += share;
        expShares[id] = share;
      });
    }

    expenseSharesList.push({
      expense: exp,
      payerId: exp.payerId,
      shares: expShares
    });
  });

  // 2. Individual Net Balances
  const individualBalances = {};
  members.forEach(m => {
    const paid = totalPaid[m.id] || 0;
    const cost = totalCost[m.id] || 0;
    individualBalances[m.id] = {
      member: m,
      paid: Math.round(paid),
      cost: Math.round(cost),
      net: Math.round(paid - cost)
    };
  });

  // 3. Couple & Family Household Consolidation
  const processedAdultIds = new Set();
  const householdConsolidated = {};
  const memberToHouseholdId = {};

  const adults = members.filter(m => m.type === 'adult');

  adults.forEach(adult => {
    if (processedAdultIds.has(adult.id)) return;

    const spouse = adult.spouseId ? memberMap[adult.spouseId] : null;
    const isCouple = spouse && spouse.type === 'adult' && spouse.spouseId === adult.id;

    const hAdults = [adult];
    processedAdultIds.add(adult.id);
    if (isCouple) {
      hAdults.push(spouse);
      processedAdultIds.add(spouse.id);
    }

    const adultIdSet = new Set(hAdults.map(a => a.id));
    const hChildren = members.filter(m => m.type === 'child' && adultIdSet.has(m.parentId));

    const householdId = hAdults.map(a => a.id).join('_');
    hAdults.forEach(a => { memberToHouseholdId[a.id] = householdId; });
    hChildren.forEach(c => { memberToHouseholdId[c.id] = householdId; });

    let totalPaidSum = 0;
    let totalCostSum = 0;
    let totalNetSum = 0;

    hAdults.forEach(a => {
      const bal = individualBalances[a.id] || { paid: 0, cost: 0, net: 0 };
      totalPaidSum += bal.paid;
      totalCostSum += bal.cost;
      totalNetSum += bal.net;
    });

    hChildren.forEach(c => {
      const bal = individualBalances[c.id] || { paid: 0, cost: 0, net: 0 };
      totalPaidSum += bal.paid;
      totalCostSum += bal.cost;
      totalNetSum += bal.net;
    });

    householdConsolidated[householdId] = {
      id: householdId,
      primaryAdult: adult,
      adults: hAdults,
      children: hChildren,
      isCouple,
      totalPaid: Math.round(totalPaidSum),
      totalCost: Math.round(totalCostSum),
      totalNet: Math.round(totalNetSum)
    };
  });

  // Standalone Children
  members.filter(m => m.type === 'child').forEach(child => {
    if (!memberToHouseholdId[child.id]) {
      memberToHouseholdId[child.id] = child.id;
      const bal = individualBalances[child.id] || { paid: 0, cost: 0, net: 0 };
      householdConsolidated[child.id] = {
        id: child.id,
        primaryAdult: child,
        adults: [child],
        children: [],
        isCouple: false,
        totalPaid: Math.round(bal.paid),
        totalCost: Math.round(bal.cost),
        totalNet: Math.round(bal.net)
      };
    }
  });

  // 4. Direct Payer Reimbursement Transfers Calculation (按代付者直連歸還模式)
  // Pairwise map: "fromHouseholdId___toHouseholdId" => total sum
  const pairwiseDebts = {};

  expenseSharesList.forEach(({ payerId, shares }) => {
    const payerHhId = memberToHouseholdId[payerId];
    if (!payerHhId) return;

    Object.entries(shares).forEach(([beneficiaryId, shareAmt]) => {
      const benHhId = memberToHouseholdId[beneficiaryId];
      if (!benHhId || benHhId === payerHhId || shareAmt <= 0) return;

      const key = `${benHhId}___${payerHhId}`;
      pairwiseDebts[key] = (pairwiseDebts[key] || 0) + shareAmt;
    });
  });

  // Simplify bidirectional pairwise debts between the exact two households
  const transfers = [];
  const processedPairs = new Set();

  Object.keys(pairwiseDebts).forEach(key => {
    if (processedPairs.has(key)) return;

    const [hFrom, hTo] = key.split('___');
    const reverseKey = `${hTo}___${hFrom}`;
    processedPairs.add(key);
    processedPairs.add(reverseKey);

    const amt1 = pairwiseDebts[key] || 0;
    const amt2 = pairwiseDebts[reverseKey] || 0;

    const netAmt = amt1 - amt2;
    const hhFrom = householdConsolidated[hFrom];
    const hhTo = householdConsolidated[hTo];

    if (!hhFrom || !hhTo) return;

    if (netAmt > 1) {
      transfers.push({
        fromId: hhFrom.id,
        fromName: getHouseholdDisplayName(hhFrom),
        toId: hhTo.id,
        toName: getHouseholdDisplayName(hhTo),
        amount: Math.round(netAmt)
      });
    } else if (netAmt < -1) {
      transfers.push({
        fromId: hhTo.id,
        fromName: getHouseholdDisplayName(hhTo),
        toId: hhFrom.id,
        toName: getHouseholdDisplayName(hhFrom),
        amount: Math.round(Math.abs(netAmt))
      });
    }
  });

  return {
    totalAmount: Math.round(totalAmount),
    individualBalances,
    householdConsolidated,
    transfers
  };
}

export function getHouseholdDisplayName(hh) {
  let title = '';
  if (hh.isCouple && hh.adults.length > 1) {
    title = `${hh.adults[0].name} & ${hh.adults[1].name} (夫妻檔)`;
  } else {
    title = hh.primaryAdult.name;
  }

  if (hh.children && hh.children.length > 0) {
    const cNames = hh.children.map(c => c.name).join('、');
    title += ` (含 ${cNames})`;
  }
  return title;
}

export function generateLineShareText(members, expenses, tripName = '多人記帳拆帳') {
  const settlement = calculateSettlement(members, expenses);
  const { totalAmount, householdConsolidated, transfers } = settlement;

  let text = `✈️ 【${tripName || '多人記帳拆帳'} - 結算報告】 📊\n`;
  text += `----------------------------\n`;
  text += `💰 活動總消費金額：$${totalAmount.toLocaleString()} 元\n`;
  text += `📝 總消費筆數：${expenses.length} 筆\n\n`;

  text += `👨‍👩‍👧‍👦 【家庭/戶頭收支統計】\n`;
  Object.values(householdConsolidated).forEach(hh => {
    const name = getHouseholdDisplayName(hh);
    const net = hh.totalNet;
    const netFormatted = Math.abs(net).toLocaleString();
    text += `${name}：代付 $${hh.totalPaid.toLocaleString()} / 消費 $${hh.totalCost.toLocaleString()} ➔ `;
    if (net > 0) {
      text += `🟢 淨應收 $${netFormatted} 元\n`;
    } else if (net < 0) {
      text += `🔴 淨應付 $${netFormatted} 元\n`;
    } else {
      text += `⚪ 已平結 ($0)\n`;
    }
  });

  text += `\n💳 【按代付者直連轉帳清償方案】\n`;
  if (transfers.length === 0) {
    text += `🎉 所有人帳務均已完美平衡，無需轉帳！\n`;
  } else {
    transfers.forEach((t, i) => {
      text += `${i + 1}. 👉 ${t.fromName} 需轉給 🏦 ${t.toName} 💰 $${t.amount.toLocaleString()} 元\n`;
    });
  }

  text += `\n----------------------------\n`;
  text += `📱 本報告由「多人記帳拆帳」自動計算產生`;

  return text;
}
