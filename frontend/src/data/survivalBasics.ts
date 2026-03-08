export interface SurvivalCosts {
  transitPass: number;
  averageGasPrice: number; // per liter
}

export const survivalBasics: Record<string, SurvivalCosts> = {
  Toronto: {
    transitPass: 156.00,
    averageGasPrice: 1.55
  },
  Hamilton: {
    transitPass: 118.80,
    averageGasPrice: 1.50
  },
  Guelph: {
    transitPass: 80.00,
    averageGasPrice: 1.52
  },
  Ottawa: {
    transitPass: 128.75,
    averageGasPrice: 1.54
  },
  Mississauga: {
    transitPass: 141.00,
    averageGasPrice: 1.54
  }
};
