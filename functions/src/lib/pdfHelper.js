const PdfPrinter = require("pdfmake/src/printer");

exports.createPdfBinary = (docDefinition) => {
  const fontDescriptors = {
    Roboto: {
      normal:
        "https://asia-southeast2-erp-firebase-4e1a2.cloudfunctions.net/static/assets/fonts/Roboto-Regular.ttf",
      bold: "https://asia-southeast2-erp-firebase-4e1a2.cloudfunctions.net/static/assets/fonts/Roboto-Medium.ttf",
      italics:
        "https://asia-southeast2-erp-firebase-4e1a2.cloudfunctions.net/static/assets/fonts/Roboto-Italic.ttf",
      bolditalics:
        "https://asia-southeast2-erp-firebase-4e1a2.cloudfunctions.net/static/assets/fonts/Roboto-MediumItalic.ttf",
    },
  };
  const printer = new PdfPrinter(fontDescriptors);
  const doc = printer.createPdfKitDocument(docDefinition);

  let chunks = [];
  let result;

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {
    const chunksBase64 = Buffer.concat(chunks).toString("base64");
    result = `data:application/pdf;base64,${chunksBase64}`;
  });
  doc.end();

  return result;
};
