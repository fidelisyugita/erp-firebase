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
      imageUrl: obj.imageUrl,
      category: this.thinObject(obj.category),
      measureUnit: this.thinObject(obj.measureUnit),
      pricePerUnit: Number(obj.pricePerUnit || 0),
      totalUnit: Number(obj.totalUnit || 0),
    };
  return null;
};
