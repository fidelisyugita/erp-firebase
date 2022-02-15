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
      { text: `SKU: ${product.sku}`, style: "header" },
      { image: canvas.toDataURL(), width: 300, height: 80 },
      { text: `Nama Produk: ${product.name}`, margin: [0, 10, 0, 0] },
      // { image: product.imageUrl, fit: [200, 200] },
      `Kategori: ${product?.category?.name}`,
      `Deskripsi: ${product.description}`,
      { text: `Satuan: ${product?.measureUnit?.name}`, margin: [0, 10, 0, 0] },
      `Stock: ${product.stock}`,
      `Terjual: ${product.totalSold}`,
    ],

    styles: {
      header: {
        fontSize: 22,
        bold: true,
      },
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

exports.generateDO = (transaction, callback) => {
  const canvas = createCanvas(0, 0);
  // create a bar code with the number/text I want and populate the canvas with it..
  JsBarcode(canvas, transaction.id);

  const docDefinition = {
    content: [
      { text: `Kode Invoice: ${transaction.invoiceCode}`, style: "header" },
      { image: canvas.toDataURL(), width: 300, height: 80 },
      {
        text: `Note: ${transaction.note}`,
        margin: [0, 10, 0, 0],
      },
    ],

    styles: {
      header: {
        fontSize: 22,
        bold: true,
      },
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
