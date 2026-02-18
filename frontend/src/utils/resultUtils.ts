type Result = "win" | "loss" | "lose" | null;

interface ResultDisplay {
  text: string;
  className: string;
}

export const getResultDisplay = (result: Result | string | undefined): ResultDisplay => {
  if (!result) {
    return {
      text: "UNKNOWN",
      className: "bg-gray-600/20 text-gray-400 border border-gray-600/30",
    };
  }

  switch (result.toLowerCase()) {
    case "win":
      return {
        text: "WIN",
        className: "bg-green-600/20 text-green-400 border border-green-600/30",
      };
    case "loss":
    case "lose":
      return {
        text: "LOSS",
        className: "bg-red-600/20 text-red-400 border border-red-600/30",
      };
    default:
      return {
        text: "UNKNOWN",
        className: "bg-gray-600/20 text-gray-400 border border-gray-600/30",
      };
  }
};

export const getResultText = (result: Result | string | undefined): string => {
  return getResultDisplay(result).text;
};

export const getResultClassName = (result: Result | string | undefined): string => {
  return getResultDisplay(result).className;
};

export const isWin = (result: Result | string | undefined): boolean => {
  return !!result && result.toLowerCase() === "win";
};

export const isLoss = (result: Result | string | undefined): boolean => {
  return !!result && ["loss", "lose"].includes(result.toLowerCase());
};

export const isUnknownResult = (result: Result | string | undefined): boolean => {
  return !result || !["win", "loss", "lose"].includes(result.toLowerCase());
};

export const getOppositeResult = (result: Result | string | undefined): string | null => {
  if (isWin(result)) return "loss";
  if (isLoss(result)) return "win";
  return null;
};

export const calculateWinRate = (results: (Result | string | undefined)[]): number => {
  if (!results || results.length === 0) return 0;

  const wins = results.filter(isWin).length;
  return Math.round((wins / results.length) * 100);
};

interface ResultCounts {
  wins: number;
  losses: number;
  unknown: number;
  total: number;
}

export const countResults = (results: (Result | string | undefined)[]): ResultCounts => {
  if (!results || results.length === 0) {
    return { wins: 0, losses: 0, unknown: 0, total: 0 };
  }

  const wins = results.filter(isWin).length;
  const losses = results.filter(isLoss).length;
  const unknown = results.filter(isUnknownResult).length;

  return { wins, losses, unknown, total: results.length };
};

export const getResultStats = (results: (Result | string | undefined)[]) => {
  const counts = countResults(results);
  const winRate = calculateWinRate(results);

  return { ...counts, winRate };
};
