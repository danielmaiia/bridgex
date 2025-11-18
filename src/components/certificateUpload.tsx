"use client";

import { useState } from "react";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";

type Props = {
  onSaved?: () => void;
};

export function CertificateUpload({ onSaved }: Props) {
  const { user } = useSupabaseUser();

  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [emissor, setEmissor] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");   // YYYY-MM-DD
  const [cargaHoraria, setCargaHoraria] = useState("");
  const [chaveValidacao, setChaveValidacao] = useState("");
  const [rawText, setRawText] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!user) {
      setError("Você precisa estar autenticado para enviar certificados.");
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setIsProcessing(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", selected);

      const res = await fetch("/api/certificates/parse", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        throw new Error("Falha ao processar certificado");
      }

      const json = await res.json();

      setRawText(json.rawText || "");

      const parsed = json.parsed || {};
      setTitulo(parsed.titulo_curso || "");
      setEmissor(parsed.emissor || "");
      setDataEmissao(parsed.data_emissao || ""); // já vem em YYYY-MM-DD
      setCargaHoraria(
        parsed.carga_horaria != null ? String(parsed.carga_horaria) : ""
      );
      setChaveValidacao(parsed.chave_validacao || "");
    } catch (err: any) {
      console.error(err);
      setError("Não consegui processar o certificado. Tente outra imagem/PDF.");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSave() {
    if (!user) {
      setError("Você precisa estar autenticado para salvar certificados.");
      return;
    }
    if (!file) {
      setError("Nenhum arquivo selecionado.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("user_id", user.id);
      form.append("titulo", titulo);
      form.append("emissor", emissor);
      form.append("data_emissao", dataEmissao);
      form.append("carga_horaria", cargaHoraria);
      form.append("chave_validacao", chaveValidacao);
      form.append("raw_text", rawText);

      const res = await fetch("/api/certificates/save", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Erro ao salvar certificado");
      }

      // Opcional: pegar o certificado salvo
      // const json = await res.json();
      // console.log("Certificado salvo:", json.certificate);

      if (onSaved) onSaved();

      // limpar formulário
      setFile(null);
      setFileName(null);
      setTitulo("");
      setEmissor("");
      setDataEmissao("");
      setCargaHoraria("");
      setChaveValidacao("");
      setRawText("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar certificado.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 card">
      <div>
        <h2 className="text-sm font-semibold">Upload de certificado (OCR)</h2>
        <p className="text-xs text-slate-400 mt-1">
          Envie uma imagem ou PDF. O OCR e a IA serão processados no servidor.
        </p>
      </div>

      <label
        htmlFor="uploadCertificado"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 cursor-pointer hover:border-emerald-400 text-xs"
      >
        {fileName ? `Arquivo: ${fileName}` : "Escolher arquivo"}
        <input
          id="uploadCertificado"
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {isProcessing && (
        <p className="text-xs text-emerald-400">
          Processando OCR e IA no servidor...
        </p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {rawText && (
        <>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <label
                htmlFor="titulo"
                className="block text-xs mb-1 text-slate-300"
              >
                Título do curso / certificação
              </label>
              <input
                id="titulo"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="emissor"
                className="block text-xs mb-1 text-slate-300"
              >
                Emissor
              </label>
              <input
                id="emissor"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={emissor}
                onChange={(e) => setEmissor(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="dataEmissao"
                className="block text-xs mb-1 text-slate-300"
              >
                Data de emissão
              </label>
              <input
                id="dataEmissao"
                type="date"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="cargaHoraria"
                className="block text-xs mb-1 text-slate-300"
              >
                Carga horária (horas)
              </label>
              <input
                id="cargaHoraria"
                type="number"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={cargaHoraria}
                onChange={(e) => setCargaHoraria(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              <label
                htmlFor="chaveValidacao"
                className="block text-xs mb-1 text-slate-300"
              >
                Chave de validação
              </label>
              <input
                id="chaveValidacao"
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                value={chaveValidacao}
                onChange={(e) => setChaveValidacao(e.target.value)}
              />
            </div>
          </div>

          <div className="text-xs">
            <label
              htmlFor="textoBruto"
              className="block mb-1 text-slate-300"
            >
              Texto bruto reconhecido (OCR)
            </label>
            <textarea
              id="textoBruto"
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 min-h-[120px]"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-sm font-medium hover:bg-emerald-400 disabled:opacity-60"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar certificado"}
          </button>
        </>
      )}
    </div>
  );
}
