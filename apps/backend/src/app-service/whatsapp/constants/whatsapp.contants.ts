export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const isGreeting = (message: string): boolean => {
  const greetings = ['hi', 'hello', 'hey', 'sasa'];
  return greetings.some((g) => message.includes(g));
};

export const isPositive = (message: string): boolean => {
  const positives = ['yes', 'y', 'sure', 'yeah', 'yep', 'ok'];
  return positives.some((p) => message.includes(p));
};

export const isNegative = (message: string): boolean => {
  const negatives = ['no', 'nah', 'n'];
  return negatives.some((n) => message.includes(n));
};
