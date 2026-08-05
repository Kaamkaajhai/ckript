import { useCallback } from "react";
import { SCRIPT_UPLOAD_TERMS_VERSION } from "../constants";
import { getContentTypeFromFormat } from "../lib/format";
import { normalizeRightsLicensingState } from "../lib/rights";
import { buildScriptCompletionPayload } from "../../../utils/scriptCompletion";

/**
 * Assembles the server payloads from wizard state: the rights-licensing block,
 * the optional script-preview window, and the full draft/submit payload (which
 * composes the other two). These are pure builders (no side effects) memoized
 * with the same dependencies as before, so the autosave signature comparison
 * that keys off buildDraftPayload's identity behaves identically.
 */
export function usePayloads({
  editor,
  formData,
  screenplayEnabled,
  title,
  savedBaseContentRef,
  writers,
  screenplayValue,
  sceneSynopses,
  outlineNotes,
  titlePageActive,
  titlePage,
  targetFilm,
  targetPublishing,
  estimatedPages,
  classification,
  previewPageTexts,
  legal,
  collabVisibility,
  filmDetails,
  publishingDetails,
  scriptId,
  rightsLicensing,
}) {
  const buildRightsPayload = useCallback(() => {
    const normalized = normalizeRightsLicensingState(rightsLicensing || {});
    const royaltyBased = ["lower_upfront_plus_royalty_percent", "revenue_sharing_model"].includes(normalized.paymentStructure);

    return {
      ...normalized,
      legalAcknowledgement: {
        ...normalized.legalAcknowledgement,
        platformTermsAccepted: Boolean(legal.agreedToTerms) || Boolean(normalized.legalAcknowledgement.platformTermsAccepted),
      },
      royaltySettings: royaltyBased
        ? normalized.royaltySettings
        : { percentage: 0, durationType: "none", durationYears: 0 },
      timeBound: {
        ...normalized.timeBound,
        licenseDurationMonths: normalized.rightsType === "exclusive_license"
          ? normalized.timeBound.licenseDurationMonths
          : 0,
      },
      termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
      lastUpdatedAt: new Date().toISOString(),
    };
  }, [legal.agreedToTerms, rightsLicensing]);

  const buildScriptPreviewPayload = useCallback((source = formData) => {
    if (!source.viewableScript) {
      return null;
    }

    const mode = "pages";
    const start = Math.max(1, Number(source.previewWindowStart || 1) || 1);
    const end = Math.max(start, Number(source.previewWindowEnd || 8) || 8);
    return { mode, start, end };
  }, [formData]);

  // Manual memoization kept verbatim from the original component: the dep array
  // intentionally omits previewPageTexts (and buildScriptPreviewPayload) so this
  // callback's identity — which the autosave signature keys off — changes no more
  // often than before. Adding those deps would re-fire autosave on every edit.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const buildDraftPayload = useCallback(() => {
    if (!editor) return null;
    const screenplayMode = getContentTypeFromFormat(formData.format) !== "book" && screenplayEnabled;
    return {
      title: title?.trim() ? title.trim() : "Untitled Draft",
      textContent: screenplayMode ? screenplayValue : editor.getHTML(),
      fountainContent: screenplayMode ? screenplayValue : undefined,
      // Server-side three-way merge base for co-written scripts (see saveDraft). Undefined on a
      // brand-new draft, where there is nothing to merge against.
      baseContent: savedBaseContentRef?.current || undefined,
      sceneSynopses: screenplayMode ? sceneSynopses : undefined,
      outlineNotes: screenplayMode ? outlineNotes : undefined,
      titlePage: screenplayMode ? (titlePageActive ? titlePage : null) : undefined,
      companyName: String(formData.companyName || "").trim(),
      // Authorship credits (display-only). Blank rows are dropped server-side too, but filtering
      // here keeps the autosave signature stable while someone is mid-typing a new name.
      writers: (writers || [])
        .filter((w) => String(w?.name || "").trim())
        .map((w, index) => ({
          userId: w?.userId || null,
          name: String(w.name).trim(),
          creditType: w?.creditType || "written_by",
          order: index,
        })),
      format: formData.format,
      styleMedium: targetFilm ? formData.styleMedium : undefined,
      contentType: getContentTypeFromFormat(formData.format),
      formatOther: formData.format === "other" ? String(formData.formatOther || "").trim() : "",
      logline: formData.logline,
      synopsis: formData.synopsis,
      pageCount: estimatedPages,
      primaryGenre: formData.primaryGenre,
      classification: {
        primaryGenre: formData.primaryGenre || "",
        secondaryGenre: "",
        tones: classification.tones,
        themes: classification.themes,
        settings: classification.settings,
      },
      viewableScript: Boolean(formData.viewableScript),
      scriptPreviewAccess: buildScriptPreviewPayload(formData),
      scriptPreviewPageTexts: previewPageTexts,
      scriptCompletion: buildScriptCompletionPayload(formData),
      legal: {
        agreedToTerms: Boolean(legal.agreedToTerms),
        termsVersion: SCRIPT_UPLOAD_TERMS_VERSION,
        customInvestorTerms: String(legal.customInvestorTerms || "").trim(),
      },
      collabVisibility,
      rightsLicensing: buildRightsPayload(),
      filmDetails: {
        filmLanguage: filmDetails.filmLanguage === "Other" ? (filmDetails.filmLanguageCustom || "Other") : filmDetails.filmLanguage,
        dialoguesPresent: filmDetails.dialoguesPresent,
        wantToDirect: filmDetails.wantToDirect,
        wantToProduce: filmDetails.wantToProduce,
        scriptStyle: filmDetails.scriptStyle,
      },
      targetIndustry: [
        ...(targetFilm ? ["film"] : []),
        ...(targetPublishing ? ["publishing"] : [])
      ],
      publishingDetails,
      ...(scriptId ? { scriptId } : {}),
    };
  }, [buildRightsPayload, classification.settings, classification.themes, classification.tones, collabVisibility, editor, estimatedPages, filmDetails, formData, legal.agreedToTerms, legal.customInvestorTerms, scriptId, title, targetFilm, targetPublishing, publishingDetails, screenplayValue, screenplayEnabled, sceneSynopses, outlineNotes, titlePage, titlePageActive, writers]);

  return { buildRightsPayload, buildScriptPreviewPayload, buildDraftPayload };
}
