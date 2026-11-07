const POOL_FIELDS = ['accuracy1', 'accuracy2', 'damage1', 'damage2'] as const;

/** Some move sources name the Allure skill "Charm"; sheets and dice pools only know Allure. Mutates and returns the move. */
export function charmToAllure<T extends Record<string, any>>(move: T): T {
  for (const field of POOL_FIELDS) {
    const value = move[field];
    if (typeof value === 'string' && /\bcharm\b/i.test(value)) (move as Record<string, unknown>)[field] = value.replace(/\bcharm\b/gi, 'Allure');
  }
  return move;
}
