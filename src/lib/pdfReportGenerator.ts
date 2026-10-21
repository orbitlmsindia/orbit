import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CompanyBrandingSettings, getCompanyBranding } from "@/services/brandingService";

/**
 * Escape HTML special characters for safe injection into print template
 */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export interface MnemonicPdfItem {
  id?: string;
  title: string;
  acronym: string;
  phrase: string;
  subject?: string;
  category?: string;
  explanation?: string;
  breakdown?: { letter: string; word: string; meaning: string }[];
  examTip?: string;
}

export interface FlashcardPdfItem {
  id?: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
  notes?: string;
}

/**
 * Generate and download Mnemonics PDF with official company letterhead & background watermark
 */
export async function downloadMnemonicsPdf(options: {
  mnemonics: MnemonicPdfItem[];
  courseTitle?: string;
  branding?: CompanyBrandingSettings;
}): Promise<void> {
  const { mnemonics, courseTitle = "Curriculum Course" } = options;
  const branding = options.branding || getCompanyBranding();

  // Create temporary offscreen container for high-fidelity vector rendering
  const printWrapper = document.createElement("div");
  printWrapper.id = "orbit-pdf-export-wrapper";
  printWrapper.style.position = "fixed";
  printWrapper.style.left = "-9999px";
  printWrapper.style.top = "0";
  printWrapper.style.width = "800px";
  printWrapper.style.backgroundColor = "#ffffff";
  printWrapper.style.color = "#0f172a";
  printWrapper.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  printWrapper.style.padding = "40px";
  printWrapper.style.boxSizing = "border-box";
  printWrapper.style.overflow = "hidden";

  const watermarkImgSrc = branding.watermarkUrl || branding.logoUrl;
  const watermarkOpacity = branding.watermarkOpacity || 0.08;

  const htmlContent = `
    <div style="position: relative; width: 100%; min-height: 1000px;">
      <!-- Background Watermark / Water Drop Logo -->
      ${watermarkImgSrc ? `
        <div style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: ${watermarkOpacity};
        ">
          <img 
            src="${watermarkImgSrc}" 
            crossorigin="anonymous" 
            alt="Watermark" 
            style="width: 480px; max-width: 80%; object-fit: contain; filter: grayscale(30%);" 
          />
        </div>
      ` : ""}

      <!-- Content Container above watermark -->
      <div style="position: relative; z-index: 1;">
        <!-- Official Header / Letterhead -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #d97706; padding-bottom: 18px; margin-bottom: 24px;">
          <!-- Left: Logo & Organization Name -->
          <div style="display: flex; align-items: center; gap: 14px; max-width: 55%;">
            ${branding.logoUrl ? `
              <img 
                src="${branding.logoUrl}" 
                crossorigin="anonymous" 
                alt="Logo" 
                style="height: 58px; width: 58px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 3px;" 
              />
            ` : ""}
            <div>
              <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">
                ${escapeHtml(branding.name)}
              </h1>
              ${branding.registrationNo ? `
                <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 3px;">
                  Reg No: ${escapeHtml(branding.registrationNo)}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Right: CIN, Website, Phone, Email & Address -->
          <div style="text-align: right; font-size: 10px; color: #475569; line-height: 1.45; max-width: 42%;">
            ${branding.cin ? `
              <div style="font-weight: 700; color: #b45309; font-family: monospace; letter-spacing: 0.5px;">
                CIN: ${escapeHtml(branding.cin)}
              </div>
            ` : ""}
            ${branding.website ? `<div><strong>Web:</strong> ${escapeHtml(branding.website)}</div>` : ""}
            ${branding.phone ? `<div><strong>Phone:</strong> ${escapeHtml(branding.phone)}</div>` : ""}
            ${branding.email ? `<div><strong>Email:</strong> ${escapeHtml(branding.email)}</div>` : ""}
            ${branding.address ? `<div style="color: #64748b; margin-top: 2px;">${escapeHtml(branding.address)}</div>` : ""}
          </div>
        </div>

        <!-- Document Title Banner -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #ffedd5 100%); border: 1px solid #fed7aa; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #b45309; background: #ffffff; padding: 2px 8px; border-radius: 9999px; border: 1px solid #fcd34d;">
                OFFICIAL STUDY GUIDE
              </span>
              <h2 style="font-size: 16px; font-weight: 800; color: #78350f; margin: 6px 0 2px 0;">
                Course Mnemonics & Cognitive Memory Hooks
              </h2>
              <div style="font-size: 12px; color: #92400e; font-weight: 600;">
                ${escapeHtml(courseTitle)}
              </div>
            </div>
            <div style="text-align: right; font-size: 10px; font-family: monospace; color: #92400e;">
              <div>Items: <strong>${mnemonics.length} Concepts</strong></div>
              <div>Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>
        </div>

        <!-- Mnemonics List -->
        <div style="display: flex; flex-direction: column; gap: 18px;">
          ${mnemonics.map((m, idx) => `
            <div style="border: 1px solid #e2e8f0; border-left: 4px solid #d97706; border-radius: 8px; padding: 14px 16px; background-color: #ffffff; page-break-inside: avoid; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <!-- Top Row: Number, Title, Acronym -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <span style="font-size: 11px; font-weight: 700; color: #b45309;">#${idx + 1}.</span>
                  <span style="font-size: 14px; font-weight: 800; color: #0f172a; margin-left: 4px;">
                    ${escapeHtml(m.title)}
                  </span>
                  ${m.subject ? `
                    <span style="font-size: 10px; color: #64748b; margin-left: 8px; background: #f1f5f9; padding: 1px 6px; border-radius: 4px;">
                      ${escapeHtml(m.subject)}
                    </span>
                  ` : ""}
                </div>
                <div style="background-color: #fef3c7; border: 1px solid #fcd34d; color: #92400e; font-family: monospace; font-weight: 800; font-size: 13px; padding: 3px 10px; border-radius: 6px; letter-spacing: 1px;">
                  ${escapeHtml(m.acronym)}
                </div>
              </div>

              <!-- Memory Hook Phrase -->
              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; font-style: italic; color: #92400e; font-size: 12px; font-weight: 600;">
                "${escapeHtml(m.phrase)}"
              </div>

              <!-- Explanation -->
              ${m.explanation ? `
                <div style="font-size: 11px; color: #334155; line-height: 1.5; margin-bottom: 8px;">
                  ${escapeHtml(m.explanation)}
                </div>
              ` : ""}

              <!-- Concept Breakdown Table -->
              ${Array.isArray(m.breakdown) && m.breakdown.length > 0 ? `
                <div style="margin-top: 8px; border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: left;">
                    <thead>
                      <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; color: #475569; font-weight: 700;">
                        <th style="padding: 5px 8px; width: 45px; text-align: center;">Letter</th>
                        <th style="padding: 5px 8px; width: 130px;">Keyword</th>
                        <th style="padding: 5px 8px;">Concept Meaning</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${m.breakdown.map((b, bIdx) => `
                        <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${bIdx % 2 === 0 ? '#ffffff' : '#fcfcfc'};">
                          <td style="padding: 5px 8px; font-weight: 800; color: #d97706; text-align: center; font-family: monospace;">
                            ${escapeHtml(b.letter)}
                          </td>
                          <td style="padding: 5px 8px; font-weight: 700; color: #0f172a;">
                            ${escapeHtml(b.word)}
                          </td>
                          <td style="padding: 5px 8px; color: #475569; line-height: 1.35;">
                            ${escapeHtml(b.meaning)}
                          </td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              ` : ""}

              <!-- Exam Tip Pill -->
              ${m.examTip ? `
                <div style="margin-top: 8px; font-size: 10px; color: #047857; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 4px 8px; display: inline-block;">
                  💡 <strong>Exam Strategy:</strong> ${escapeHtml(m.examTip)}
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>

        <!-- Official Footer -->
        <div style="margin-top: 36px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8;">
          <div>
            ${escapeHtml(branding.name)} • Confidential Academic Learning Material
          </div>
          <div>
            Verified Curriculum Document • Powered by Orbit LMS
          </div>
        </div>
      </div>
    </div>
  `;

  printWrapper.innerHTML = htmlContent;
  document.body.appendChild(printWrapper);

  try {
    const canvas = await html2canvas(printWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages if long document
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const cleanCourse = courseTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    pdf.save(`${cleanCourse}_Mnemonics_Study_Guide.pdf`);
  } finally {
    document.body.removeChild(printWrapper);
  }
}

/**
 * Generate and download Flashcards PDF with official company letterhead & background watermark
 */
export async function downloadFlashcardsPdf(options: {
  flashcards: FlashcardPdfItem[];
  deckTitle?: string;
  branding?: CompanyBrandingSettings;
}): Promise<void> {
  const { flashcards, deckTitle = "Active Recall Study Deck" } = options;
  const branding = options.branding || getCompanyBranding();

  const printWrapper = document.createElement("div");
  printWrapper.id = "orbit-flashcard-pdf-export";
  printWrapper.style.position = "fixed";
  printWrapper.style.left = "-9999px";
  printWrapper.style.top = "0";
  printWrapper.style.width = "800px";
  printWrapper.style.backgroundColor = "#ffffff";
  printWrapper.style.color = "#0f172a";
  printWrapper.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
  printWrapper.style.padding = "40px";
  printWrapper.style.boxSizing = "border-box";
  printWrapper.style.overflow = "hidden";

  const watermarkImgSrc = branding.watermarkUrl || branding.logoUrl;
  const watermarkOpacity = branding.watermarkOpacity || 0.08;

  const htmlContent = `
    <div style="position: relative; width: 100%; min-height: 1000px;">
      <!-- Watermark Background -->
      ${watermarkImgSrc ? `
        <div style="
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 0;
          opacity: ${watermarkOpacity};
        ">
          <img 
            src="${watermarkImgSrc}" 
            crossorigin="anonymous" 
            alt="Watermark" 
            style="width: 480px; max-width: 80%; object-fit: contain; filter: grayscale(30%);" 
          />
        </div>
      ` : ""}

      <!-- Content Container -->
      <div style="position: relative; z-index: 1;">
        <!-- Official Header / Letterhead -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #4f46e5; padding-bottom: 18px; margin-bottom: 24px;">
          <!-- Left: Logo & Organization Name -->
          <div style="display: flex; align-items: center; gap: 14px; max-width: 55%;">
            ${branding.logoUrl ? `
              <img 
                src="${branding.logoUrl}" 
                crossorigin="anonymous" 
                alt="Logo" 
                style="height: 58px; width: 58px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 3px;" 
              />
            ` : ""}
            <div>
              <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.2;">
                ${escapeHtml(branding.name)}
              </h1>
              ${branding.registrationNo ? `
                <div style="font-size: 10px; font-family: monospace; color: #64748b; margin-top: 3px;">
                  Reg No: ${escapeHtml(branding.registrationNo)}
                </div>
              ` : ""}
            </div>
          </div>

          <!-- Right: CIN, Website, Phone, Email & Address -->
          <div style="text-align: right; font-size: 10px; color: #475569; line-height: 1.45; max-width: 42%;">
            ${branding.cin ? `
              <div style="font-weight: 700; color: #4338ca; font-family: monospace; letter-spacing: 0.5px;">
                CIN: ${escapeHtml(branding.cin)}
              </div>
            ` : ""}
            ${branding.website ? `<div><strong>Web:</strong> ${escapeHtml(branding.website)}</div>` : ""}
            ${branding.phone ? `<div><strong>Phone:</strong> ${escapeHtml(branding.phone)}</div>` : ""}
            ${branding.email ? `<div><strong>Email:</strong> ${escapeHtml(branding.email)}</div>` : ""}
            ${branding.address ? `<div style="color: #64748b; margin-top: 2px;">${escapeHtml(branding.address)}</div>` : ""}
          </div>
        </div>

        <!-- Document Title Banner -->
        <div style="background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-size: 9px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #4338ca; background: #ffffff; padding: 2px 8px; border-radius: 9999px; border: 1px solid #a5b4fc;">
                ACTIVE RECALL FLASHCARDS
              </span>
              <h2 style="font-size: 16px; font-weight: 800; color: #312e81; margin: 6px 0 2px 0;">
                ${escapeHtml(deckTitle)}
              </h2>
              <div style="font-size: 12px; color: #4338ca; font-weight: 600;">
                Official Spaced Repetition Print Edition
              </div>
            </div>
            <div style="text-align: right; font-size: 10px; font-family: monospace; color: #3730a3;">
              <div>Cards: <strong>${flashcards.length} Cards</strong></div>
              <div>Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
          </div>
        </div>

        <!-- Flashcards Grid / List -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${flashcards.map((card, idx) => `
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; background-color: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
              <!-- Card Header Bar -->
              <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 11px; font-weight: 700; color: #4f46e5;">Card #${idx + 1}</span>
                ${card.category ? `
                  <span style="font-size: 10px; color: #64748b; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 1px 6px; border-radius: 4px;">
                    ${escapeHtml(card.category)}
                  </span>
                ` : ""}
              </div>

              <!-- Two column Front & Back layout -->
              <div style="display: flex; border-bottom: 1px solid #f1f5f9;">
                <!-- Front Side -->
                <div style="flex: 1; padding: 12px 14px; border-right: 1px dashed #cbd5e1; background-color: #ffffff;">
                  <div style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    QUESTION / PROMPT (FRONT)
                  </div>
                  <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                    ${escapeHtml(card.front)}
                  </div>
                </div>

                <!-- Back Side -->
                <div style="flex: 1; padding: 12px 14px; background-color: #fafafa;">
                  <div style="font-size: 9px; font-weight: 800; color: #16a34a; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                    ANSWER / SOLUTION (BACK)
                  </div>
                  <div style="font-size: 12px; color: #1e293b; line-height: 1.45;">
                    ${escapeHtml(card.back)}
                  </div>
                </div>
              </div>

              ${card.notes ? `
                <div style="padding: 6px 14px; font-size: 10px; color: #64748b; background-color: #f8fafc; font-style: italic;">
                  Note: ${escapeHtml(card.notes)}
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>

        <!-- Official Footer -->
        <div style="margin-top: 36px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #94a3b8;">
          <div>
            ${escapeHtml(branding.name)} • Confidential Active Recall Deck
          </div>
          <div>
            Verified Curriculum Document • Powered by Orbit LMS
          </div>
        </div>
      </div>
    </div>
  `;

  printWrapper.innerHTML = htmlContent;
  document.body.appendChild(printWrapper);

  try {
    const canvas = await html2canvas(printWrapper, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const cleanTitle = deckTitle.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
    pdf.save(`${cleanTitle}_Flashcards_Deck.pdf`);
  } finally {
    document.body.removeChild(printWrapper);
  }
}
