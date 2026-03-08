export const checkAffordability = (price, budget) => {
  if (price <= budget) {
    return 'GREEN (Affordable)';
  } else if (price <= budget * 1.1) {
    return 'YELLOW (Stretch)';
  } else {
    return 'RED (Unaffordable)';
  }
};
