/**
 * Minimal valid PDF (~1 KB) for assignment upload load tests.
 * Not a real student paper — enough to pass content-type / magic-byte checks
 * if the server only validates PDF header + size.
 */
export function tinyPdfBytes() {
  // %PDF-1.1 minimal file ending with %%EOF
  const content =
    "%PDF-1.1\n" +
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n" +
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n" +
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>endobj\n" +
    "xref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000114 00000 n \n" +
    "trailer<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF\n";
  return content;
}

/**
 * Build multipart body for assignment submit.
 * Returns { body, contentType }.
 */
export function multipartPdf(fieldName, filename, pdfText) {
  const boundary = `----LectraxLoad${Date.now()}${__VU}`;
  const body =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n` +
    `Content-Type: application/pdf\r\n\r\n` +
    `${pdfText}\r\n` +
    `--${boundary}--\r\n`;

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
