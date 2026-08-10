import { useDocumentTextStore } from "../../store/documentTextStore";
import { MissingClause } from "../marketAnalysis";

export function handleAppendClause(clause: MissingClause): void {
  const store = useDocumentTextStore.getState();

  const {
    originalText = "",
    htmlContent,
    setHtmlContent,
    addClauseToTrack,
  } = store;

  const baseContent = getBaseContent(originalText, htmlContent);

  const {
    prefixTemplate,
    suffixTemplate,
  } = getArticleFormat(originalText, clause);

  const header = buildArticleHeader(
    clause,
    baseContent,
    prefixTemplate,
    suffixTemplate,
  );

  const cleanedBody = removeAiGeneratedTitle(clause.corpsSuggestion);

  const newClauseHtml = buildClauseHtml(
    header,
    clause.titreSuggestion,
    cleanedBody,
  );

  const finalContent = insertClauseIntoDocument(
    baseContent,
    newClauseHtml,
    clause.anchorText,
  );

  addClauseToTrack(clause.nom);
  setHtmlContent(finalContent);
}

function getBaseContent(
  originalText: string,
  htmlContent: string | null,
): string {
  if (htmlContent?.trim()) {
    return htmlContent;
  }

  return originalText
    .split(/\n{2,}/)
    .map(
      (bloc) =>
        `<p style="margin-bottom:14px;">${bloc.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
}

function getArticleFormat(
  originalText: string,
  clause: MissingClause,
) {
  const articleRegex =
    /(?:Article\s+\d+|(\d+)\.)(?:\s*[-–—]\s*)?/gi;

  const matches = [...originalText.matchAll(articleRegex)];

  if (matches.length > 0) {
    const matchText = matches[matches.length - 1][0];

    if (!/article/i.test(matchText)) {
      return {
        prefixTemplate: "",
        suffixTemplate: matchText.includes(".") ? "." : "",
      };
    }

    return {
      prefixTemplate: "Article ",
      suffixTemplate: /[-–—]/.test(matchText) ? " - " : " ",
    };
  }

  const numeric =
    clause.detectedFormat === "NumericOnly" ||
    (clause.lastNumberValue ?? 0) > 0;

  return {
    prefixTemplate: numeric ? "" : "Article ",
    suffixTemplate: numeric ? "." : " ",
  };
}

function buildArticleHeader(
  clause: MissingClause,
  baseContent: string,
  prefix: string,
  suffix: string,
): string {
  const baseNum = clause.lastNumberValue ?? 0;

  const addedArticles =
    (baseContent.match(/class="contract-article"/g) || []).length;

  return `${prefix}${baseNum + addedArticles + 1}${suffix}`;
}

function removeAiGeneratedTitle(text: string): string {
  let result = text;

  const match = result
    .trim()
    .match(/^(?:<strong>)?(?:article\s+(\d+)|(\d+)\s*\.?)/i);

  if (!match) return result.trim();

  const num = parseInt(match[1] || match[2], 10);

  const regex = new RegExp(
    `^\\s*(?:<strong>)?(?:article\\s+${num}|${num}\\s*\\.?)\\s*(?:-|–|—)?\\s*(?:<\\/strong>)?\\s*`,
    "i",
  );

  return result.replace(regex, "").trim();
}

function buildClauseHtml(
  header: string,
  title: string,
  body: string,
): string {
  const cleanTitle = title?.trim();

  const content = cleanTitle
    ? `${header} ${cleanTitle}<br />${body}`
    : `${header} ${body}`;

  return `<p class="contract-article" style="margin-top:14px;margin-bottom:14px;">${content}</p>`;
}

function insertClauseIntoDocument(
  baseContent: string,
  clauseHtml: string,
  anchorText?: string,
): string {
  const anchors = [
    anchorText,
    "fait a",
    "en 2 exemplaires",
    "en deux exemplaires",
    "signe a",
    "lu et approuve",
  ].filter(Boolean) as string[];

  let insertIndex = -1;

  for (const anchor of anchors) {
    insertIndex = findInsertionPoint(baseContent, anchor);

    if (insertIndex !== -1) {
      const before = baseContent.slice(0, insertIndex);

      const lastBr = before.lastIndexOf("<br");
      const lastP = before.lastIndexOf("<p");

      const best = Math.max(lastBr, lastP);

      if (best !== -1 && insertIndex - best < 300) {
        insertIndex = best;
      }

      break;
    }
  }

  if (insertIndex === -1) {
    return baseContent + clauseHtml;
  }

  return (
    baseContent.slice(0, insertIndex) +
    clauseHtml +
    baseContent.slice(insertIndex)
  );
}

function findInsertionPoint(
  html: string,
  anchor: string,
): number {
  const target = normalize(anchor);

  let plain = "";
  const indexMap: number[] = [];

  let insideTag = false;

  for (let i = 0; i < html.length; i++) {
    if (html[i] === "<") {
      insideTag = true;
      continue;
    }

    if (html[i] === ">") {
      insideTag = false;
      continue;
    }

    if (insideTag) continue;

    const normalized = normalize(html[i]);

    if (normalized) {
      plain += normalized;
      indexMap.push(i);
    }
  }

  const position = plain.indexOf(target);

  return position === -1 ? -1 : indexMap[position];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}