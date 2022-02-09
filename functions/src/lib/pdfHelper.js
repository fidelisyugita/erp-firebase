const PdfPrinter = require("pdfmake/src/printer");

exports.createPdfBinary = (docDefinition, callback) => {
  const fontDescriptors = {
    Roboto: {
      normal:
        "node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf",
      bold: "node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf",
      italics:
        "node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf",
      bolditalics:
        "node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf",
    },
  };
  const printer = new PdfPrinter(fontDescriptors);
  const doc = printer.createPdfKitDocument(docDefinition);

  let chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {
    // const stringChunks = Buffer.concat(chunks).toString("base64");
    // const base64 = `data:application/pdf;base64,${stringChunks}`;
    // callback(Buffer.from(base64.split(",")[1], "base64"));

    callback(Buffer.concat(chunks));
  });
  doc.end();
};
