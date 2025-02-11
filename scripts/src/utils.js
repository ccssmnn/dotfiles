/** @param {string} response */
export function removeCodeFence(response) {
  let codeFenceRegex = /```[a-zA-Z]*\n([\s\S]*?)```/g;

  let match = codeFenceRegex.exec(response);
  if (match && match[1]) return match[1].trim();
  if (match) return "";

  return response;
}
