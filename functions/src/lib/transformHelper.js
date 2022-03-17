const { isSameDay } = require("./utils");

exports.thinObject = (obj) => {
  if (obj && obj.id) return { id: obj.id, name: obj.name };
  return null;
};

exports.thinContact = (obj) => {
  if (obj && obj.id)
    return {
      id: obj.id,
      name: obj.name,
      phone: obj.phone,
      address: obj.address,
      note: obj.note,
      description: obj.description,
      email: obj.email,
      alias: obj.alias,
      merchant: obj.merchant,
    };
  return null;
};

exports.thinProductVariant = (obj) => {
  if (obj && obj.barcode)
    return {
      size: obj.size,
      buyingPrice: Number(obj.buyingPrice || 0),
      sellingPrice: Number(obj.sellingPrice || 0),
      stock: Number(obj.stock || 0),
      sold: Number(obj.sold || 0),

      sku: obj.sku,
      barcode: obj.barcode,

      skuLowercase: String(obj.sku).toLowerCase(),
    };
  return null;
};

exports.thinTransactionProduct = (obj) => {
  return {
    id: obj.id,
    sku: obj.sku,
    barcode: obj.barcode,
    size: obj.size,
    color: obj.color,
    brand: this.thinObject(obj.brand),
    name: obj.name,
    category: this.thinObject(obj.category),
    price: Number(obj.price || 0),
    amount: Number(obj.amount || 0),
    note: obj.note,
    imageUrl: obj.imageUrl,
    measureUnit: this.thinObject(obj.measureUnit),
  };
};

exports.standarizeData = (docData, id) => {
  const data = {
    ...docData,
    createdAt: docData.createdAt.toDate(),
    updatedAt: docData.updatedAt.toDate(),
    id: id,
  };
  return data;
};

exports.standarizeUser = (docData, id) => {
  let data = this.standarizeData(docData, id);
  if (data?.lastAttend) {
    const attendDate = data.lastAttend.toDate();
    data.lastAttend = attendDate;
    data.isAttendToday = isSameDay(attendDate, new Date());
  } else {
    data.lastAttend = null;
    data.isAttendToday = false;
  }
  return data;
};
