import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MANDATES_STATUS,
  emptyMandates,
  loadMandates,
  normalizeMandates,
  saveMandates,
  toggleMandateValue,
} from "./mandatesData";

const sameMandates = (left, right) => JSON.stringify(normalizeMandates(left)) === JSON.stringify(normalizeMandates(right));

export default function useMandates({ enabled = true, previewMandates = null } = {}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [state, setState] = useState(() => ({
    status: previewMandates ? MANDATES_STATUS.READY : MANDATES_STATUS.IDLE,
    mandates: normalizeMandates(previewMandates),
    savedMandates: normalizeMandates(previewMandates),
    failure: null,
    saveFailure: null,
    saved: false,
  }));
  const loadController = useRef(null);

  useEffect(() => {
    if (!enabled || previewMandates) return undefined;
    const controller = new AbortController();
    loadController.current = controller;
    setState((current) => ({ ...current, status: MANDATES_STATUS.LOADING, failure: null, saved: false }));
    loadMandates({ signal: controller.signal })
      .then((mandates) => setState({
        status: MANDATES_STATUS.READY,
        mandates,
        savedMandates: mandates,
        failure: null,
        saveFailure: null,
        saved: false,
      }))
      .catch((failure) => {
        if (!controller.signal.aborted) setState((current) => ({ ...current, status: MANDATES_STATUS.FAILED, failure }));
      });
    return () => controller.abort();
  }, [enabled, previewMandates, reloadToken]);

  const setMandates = useCallback((next) => setState((current) => ({
    ...current,
    mandates: normalizeMandates(typeof next === "function" ? next(current.mandates) : next),
    saveFailure: null,
    saved: false,
  })), []);
  const toggle = useCallback((field, value) => setMandates((current) => toggleMandateValue(current, field, value)), [setMandates]);
  const reset = useCallback(() => setMandates(emptyMandates()), [setMandates]);
  const retry = useCallback(() => setReloadToken((value) => value + 1), []);
  const save = useCallback(async () => {
    const controller = new AbortController();
    const draft = state.mandates;
    setState((current) => ({ ...current, status: MANDATES_STATUS.SAVING, saveFailure: null, saved: false }));
    try {
      const mandates = await saveMandates(draft, { signal: controller.signal });
      setState((current) => ({ ...current, status: MANDATES_STATUS.READY, mandates, savedMandates: mandates, saveFailure: null, saved: true }));
      return mandates;
    } catch (saveFailure) {
      setState((current) => ({ ...current, status: MANDATES_STATUS.READY, saveFailure, saved: false }));
      throw saveFailure;
    }
  }, [state.mandates]);

  return useMemo(() => ({
    ...state,
    dirty: !sameMandates(state.mandates, state.savedMandates),
    setMandates,
    toggle,
    reset,
    retry,
    save,
  }), [reset, retry, save, setMandates, state, toggle]);
}
