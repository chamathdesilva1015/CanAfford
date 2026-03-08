import { describe, it, expect } from 'vitest';
import { checkAffordability } from '../src/affordabilityHelper';

describe('CanAfford Logic Test', () => {
  it("should correctly label a $1400 rent against a $1500 budget as 'GREEN (Affordable)'", () => {
    // Arrange
    const budget = 1500;
    const rent = 1400;

    // Act
    const result = checkAffordability(rent, budget);

    // Assert
    expect(result).toBe('GREEN (Affordable)');
  });

  it("should label a $1600 rent against a $1500 budget as 'YELLOW (Stretch)'", () => {
    const result = checkAffordability(1600, 1500);
    expect(result).toBe('YELLOW (Stretch)');
  });

  it("should label a $1800 rent against a $1500 budget as 'RED (Unaffordable)'", () => {
    const result = checkAffordability(1800, 1500);
    expect(result).toBe('RED (Unaffordable)');
  });
});
