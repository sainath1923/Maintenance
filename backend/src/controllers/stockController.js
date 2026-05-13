const Stock = require('../models/Stock');
const StockRequest = require('../models/StockRequest');
const User = require('../models/User');
const Request = require('../models/Request');
const mongoose = require('mongoose');

const DEFAULT_STOCK_ITEMS_BY_CATEGORY = {
  electrical: ['Switch', 'Socket', 'MCB', 'Wire', 'LED Bulb', 'Tube Light'],
  plumbing: ['Flush Pipe', 'Tap', 'Shower Head', 'Angle Valve', 'Drain Pipe', 'Wash Basin Hose'],
  AC: ['Air Filter', 'Capacitor', 'Thermostat', 'Compressor Oil', 'Copper Tube', 'Condenser Fan'],
  Carpentry: ['Door Hinge', 'Screw', 'Wood Glue', 'Handle', 'L-Bracket', 'Drawer Channel'],
  General: ['Cleaning Cloth', 'Safety Gloves', 'Masking Tape', 'Silicone Sealant', 'Zip Tie', 'Nails'],
  Other: ['Misc Item 1', 'Misc Item 2', 'Misc Item 3']
};

exports.getStockCatalog = async (req, res) => {
  res.json({ itemsByCategory: DEFAULT_STOCK_ITEMS_BY_CATEGORY });
};

exports.listStockEntries = async (req, res) => {
  try {
    const entries = await Stock.find().sort({ updatedOn: -1, updatedAt: -1 }).lean();
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.upsertStockEntry = async (req, res) => {
  try {
    const { category, item, quantity, price, updatedOn } = req.body;

    if (!category || !item || !updatedOn) {
      return res.status(400).json({ message: 'category, item and updatedOn are required' });
    }

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({ message: 'quantity must be a valid non-negative number' });
    }

    const parsedPrice = Number(price || 0);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'price must be a valid non-negative number' });
    }

    const parsedDate = new Date(updatedOn);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'updatedOn must be a valid date' });
    }

    const normalizedQuantity = parsedQuantity;
    const isAvailable = normalizedQuantity > 0;

    const entry = await Stock.findOneAndUpdate(
      { category, item },
      {
        category,
        item,
        isAvailable,
        quantity: normalizedQuantity,
        price: parsedPrice,
        updatedOn: parsedDate,
        updatedBy: req.user?.id
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    res.json(entry);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate stock entry' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listTenantUsers = async (req, res) => {
  try {
    const tenants = await User.find({ role: 'tenant', isActive: true })
      .select('name email phone')
      .sort({ name: 1 })
      .lean();

    if (!tenants.length) {
      return res.json([]);
    }

    const tenantIds = tenants.map((tenant) => tenant._id);

    const latestTenantRequests = await Request.aggregate([
      { $match: { tenant: { $in: tenantIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$tenant',
          flatNumber: { $first: '$flatNumber' },
          block: { $first: '$block' }
        }
      }
    ]);

    const requestByTenant = new Map(
      latestTenantRequests.map((item) => [String(item._id), item])
    );

    const tenantWithFlat = tenants.map((tenant) => {
      const latest = requestByTenant.get(String(tenant._id));
      return {
        ...tenant,
        flatNumber: latest?.flatNumber || '',
        block: latest?.block || ''
      };
    });

    res.json(tenantWithFlat);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createStockRequest = async (req, res) => {
  try {
    const { stockId, quantity, tenantId, comments } = req.body;

    if (!stockId || !tenantId || quantity === undefined) {
      return res.status(400).json({ message: 'stockId, quantity and tenantId are required' });
    }

    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ message: 'quantity must be a valid number greater than 0' });
    }

    const stock = await Stock.findById(stockId).lean();
    if (!stock) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    const tenant = await User.findOne({ _id: tenantId, role: 'tenant', isActive: true }).lean();
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    const latestTenantRequest = await Request.findOne({ tenant: tenant._id })
      .sort({ createdAt: -1 })
      .select('flatNumber block')
      .lean();

    const stockRequest = await StockRequest.create({
      stock: stock._id,
      category: stock.category,
      item: stock.item,
      quantity: parsedQty,
      tenant: tenant._id,
      tenantFlatNumber: latestTenantRequest?.flatNumber || '',
      tenantBlock: latestTenantRequest?.block || '',
      comments: (comments || '').trim(),
      requestedBy: req.user.id
    });

    res.status(201).json(stockRequest);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listStockRequests = async (req, res) => {
  try {
    const requests = await StockRequest.find()
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    if (!requests.length) {
      return res.json([]);
    }

    const tenantIds = [
      ...new Set(
        requests
          .map((request) => request.tenant?._id)
          .filter(Boolean)
          .map((id) => String(id))
      )
    ].map((id) => new mongoose.Types.ObjectId(id));

    let latestTenantRequests = [];
    if (tenantIds.length) {
      latestTenantRequests = await Request.aggregate([
        { $match: { tenant: { $in: tenantIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$tenant',
            flatNumber: { $first: '$flatNumber' },
            block: { $first: '$block' }
          }
        }
      ]);
    }

    const byTenantId = new Map(
      latestTenantRequests.map((item) => [String(item._id), item])
    );

    const mapped = requests.map((request) => {
      const tenantId = request.tenant?._id ? String(request.tenant._id) : '';
      const latest = tenantId ? byTenantId.get(tenantId) : null;
      return {
        ...request,
        tenantFlatNumber: request.tenantFlatNumber || latest?.flatNumber || '',
        tenantBlock: request.tenantBlock || latest?.block || ''
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveStockRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }

    if (stockRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending requests can be approved' });
    }

    const stock = await Stock.findById(stockRequest.stock);
    if (!stock) {
      return res.status(404).json({ message: 'Stock item not found' });
    }

    if (!stock.isAvailable || stock.quantity < stockRequest.quantity) {
      return res.status(400).json({ message: 'Insufficient stock quantity to approve request' });
    }

    stock.quantity = stock.quantity - stockRequest.quantity;
    stock.isAvailable = stock.quantity > 0;
    stock.updatedOn = new Date();
    stock.updatedBy = req.user.id;
    await stock.save();

    stockRequest.status = 'Approved';
    stockRequest.approvedBy = req.user.id;
    stockRequest.approvedAt = new Date();
    await stockRequest.save();

    const approved = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    res.json(approved);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};