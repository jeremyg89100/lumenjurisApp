import { useState } from "react";
import { FileText, Plus, Calendar, Loader2, Check, X, Paperclip } from "lucide-react";
import type { AmendmentDTO } from "./types";

interface Props {
  contractId: string;
  amendments: AmendmentDTO[];
  onAddAmendment: (payload: Partial<AmendmentDTO>) => Promise<void>;
}

export function Amendments({ amendments, onAddAmendment }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Formulaire local
  const [form, setForm] = useState({
    title: "",
    summary: "",
    signatureDate: "",
    effectiveDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setLoading(true);
    try {
      await onAddAmendment({
        title: form.title,
        summary: form.summary || null,
        signatureDate: form.signatureDate ? new Date(form.signatureDate).toISOString() : null,
        effectiveDate: form.effectiveDate ? new Date(form.effectiveDate).toISOString() : null,
      });
      setForm({ title: "", summary: "", signatureDate: "", effectiveDate: "" });
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#354F99]" />
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Avenants ({amendments.length})
          </p>
        </div>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#354F99] hover:bg-[#354F99]/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {/* Formulaire de création d'avenant */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 text-xs">
          <p className="font-semibold text-gray-700">Nouvel avenant</p>
          
          <div>
            <label className="block text-gray-500 mb-1">Titre *</label>
            <input
              type="text"
              required
              placeholder="Ex: Avenant n°1 — Extension de périmètre"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-[#354F99]"
            />
          </div>

          <div>
            <label className="block text-gray-500 mb-1">Résumé des modifications</label>
            <textarea
              rows={2}
              placeholder="Ex: Ajout du module analytics."
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-800 outline-none focus:border-[#354F99]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-gray-500 mb-1">Date de signature</label>
              <input
                type="date"
                value={form.signatureDate}
                onChange={(e) => setForm({ ...form, signatureDate: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-[#354F99]"
              />
            </div>
            <div>
              <label className="block text-gray-500 mb-1">Date d'effet</label>
              <input
                type="date"
                value={form.effectiveDate}
                onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-700 outline-none focus:border-[#354F99]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-white bg-[#354F99] hover:bg-[#1a2d5a] rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Liste des avenants existants */}
      {amendments.length === 0 ? (
        <p className="text-xs text-gray-400 italic text-center py-2">Aucun avenant rattaché.</p>
      ) : (
        <div className="space-y-2">
          {amendments.map((am) => (
            <div key={am.id} className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl space-y-1 hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-800">{am.title}</span>
                {am.hasDocument && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 bg-white border px-1.5 py-0.5 rounded-full">
                    <Paperclip className="w-3 h-3" /> PDF
                  </span>
                )}
              </div>

              {am.summary && (
                <p className="text-[11px] text-gray-600 leading-snug">{am.summary}</p>
              )}

              <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                {am.signatureDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Signé le : {new Date(am.signatureDate).toLocaleDateString("fr-FR")}
                  </span>
                )}
                {am.effectiveDate && (
                  <span>Effet : {new Date(am.effectiveDate).toLocaleDateString("fr-FR")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
