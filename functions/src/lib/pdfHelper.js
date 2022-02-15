const PdfPrinter = require("pdfmake/src/printer");
const JsBarcode = require("jsbarcode");
const { createCanvas } = require("canvas");

const fontDescriptors = {
  Roboto: {
    normal: "node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf",
    bold: "node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf",
    italics: "node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf",
    bolditalics:
      "node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf",
  },
};

exports.generatePdfProduct = (product, callback) => {
  const canvas = createCanvas(0, 0);

  // create a bar code with the number/text I want and populate the canvas with it..
  JsBarcode(canvas, product.id);

  const docDefinition = {
    content: [
      `SKU: ${product.sku}`,
      { image: canvas.toDataURL(), width: 200, height: 80 },
      `Product Name: ${product.name}`,
      // { image: product.imageUrl, width: 200, height: 200 },
      `Category: ${product?.category?.name}`,
      `Description: ${product.description}`,
      `Stock: ${product.stock}`,
      `Satuan: ${product.measureUnit}`,
      `Terjual: ${product.totalSold}`,
    ],
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
