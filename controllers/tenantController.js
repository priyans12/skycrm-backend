const Tenant = require('../models/Tenant');

exports.createTenant = async (req, res) => {
  try {
    const { name, subdomain } = req.body;
    const tenant = await Tenant.create({ name, subdomain });
    res.status(201).json(tenant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find();
    res.json(tenants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
