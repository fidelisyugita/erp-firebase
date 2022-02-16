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

exports.thinProduct = (obj) => {
  if (obj && obj.id)
    return {
      id: obj.id,
      name: obj.name,
      barcode: obj.barcode,
      sku: obj.sku,
      size: obj.size,
      imageUrl: obj.imageUrl,
      brand: this.thinObject(obj.brand),
      category: this.thinObject(obj.category),
      measureUnit: this.thinObject(obj.measureUnit),
      pricePerUnit: Number(obj.pricePerUnit || 0),
      totalUnit: Number(obj.totalUnit || 0),
    };
  return null;
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
  }
  return data;
};
