const Stock = require('../models/Stock');
const StockRequest = require('../models/StockRequest');
const User = require('../models/User');
const Request = require('../models/Request');
const CompanyProfile = require('../models/CompanyProfile');
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

    const profile = await CompanyProfile.findOne().lean();
    const buildingName = profile?.buildingName || '';

    const stockRequest = await StockRequest.create({
      stock: stock._id,
      category: stock.category,
      item: stock.item,
      quantity: parsedQty,
      tenant: tenant._id,
      tenantFlatNumber: latestTenantRequest?.flatNumber || '',
      tenantBlock: latestTenantRequest?.block || '',
      buildingName,
      maintenanceRequest: latestTenantRequest?._id || null,
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
    const role = req.user?.role;
    let statusFilter = {};
    if (role === 'supervisor') statusFilter = { status: { $in: ['Pending', 'SupervisorApproved', 'SupervisorRejected', 'ProcurementRequested', 'Approved', 'Dispatched', 'Delivered'] } };
    else if (role === 'procurement') statusFilter = { status: { $in: ['SupervisorApproved', 'ProcurementRequested', 'Approved'] } };
    else if (role === 'stores') statusFilter = { status: { $in: ['ProcurementRequested', 'Approved', 'Dispatched', 'Delivered'] } };
    else if (role === 'technician') statusFilter = { requestedBy: req.user.id };
    else if (role === 'delivery') statusFilter = { assignedTo: req.user.id };
    // admin sees all

    const requests = await StockRequest.find(statusFilter)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('assignedTo', 'name email phone')
      .populate('maintenanceRequest', 'images video')
      .sort({ createdAt: -1 })
      .lean();

    if (!requests.length) {
      return res.json([]);
    }

    // For old records that predate the maintenanceRequest link, fall back to
    // finding the maintenance request that was active when the stock request was created.
    const needsFallback = requests.filter((r) => !r.maintenanceRequest && r.tenant?._id);
    const fallbackMap = new Map();
    if (needsFallback.length) {
      await Promise.all(
        needsFallback.map(async (r) => {
          const mr = await Request.findOne({
            tenant: r.tenant._id,
            createdAt: { $lte: r.createdAt }
          })
            .sort({ createdAt: -1 })
            .select('images video')
            .lean();
          if (mr) fallbackMap.set(String(r._id), mr);
        })
      );
    }

    const mapped = requests.map((request) => {
      const mr = request.maintenanceRequest;
      const fallback = mr ? null : fallbackMap.get(String(request._id));
      return {
        ...request,
        requestImages: mr?.images || fallback?.images || [],
        requestVideo: mr?.video || fallback?.video || ''
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.supervisorApproveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (stockRequest.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending requests can be reviewed by supervisor' });
    }
    if (action === 'reject') {
      stockRequest.status = 'SupervisorRejected';
    } else {
      stockRequest.status = 'SupervisorApproved';
      stockRequest.supervisorApprovedBy = req.user.id;
      stockRequest.supervisorApprovedAt = new Date();
    }
    await stockRequest.save();
    const updated = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('supervisorApprovedBy', 'name email')
      .lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.procurementForwardRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (stockRequest.status !== 'SupervisorApproved') {
      return res.status(400).json({ message: 'Only supervisor-approved requests can be forwarded to stores' });
    }
    stockRequest.status = 'ProcurementRequested';
    stockRequest.procurementForwardedBy = req.user.id;
    stockRequest.procurementForwardedAt = new Date();
    await stockRequest.save();
    const updated = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('procurementForwardedBy', 'name email')
      .lean();
    res.json(updated);
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

    if (stockRequest.status !== 'ProcurementRequested') {
      return res.status(400).json({ message: 'Only procurement-requested items can be approved by stores' });
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
      .populate('assignedTo', 'name email phone')
      .lean();

    res.json(approved);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.listDeliveryPersons = async (req, res) => {
  try {
    const persons = await User.find({ role: 'delivery', isActive: true })
      .select('name email phone')
      .sort({ name: 1 })
      .lean();
    res.json(persons);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.assignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPersonId } = req.body;

    if (!deliveryPersonId) {
      return res.status(400).json({ message: 'deliveryPersonId is required' });
    }

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (stockRequest.status !== 'Approved') {
      return res.status(400).json({ message: 'Only approved requests can be assigned for delivery' });
    }

    const deliveryPerson = await User.findOne({ _id: deliveryPersonId, role: 'delivery', isActive: true }).lean();
    if (!deliveryPerson) {
      return res.status(404).json({ message: 'Delivery person not found' });
    }

    stockRequest.assignedTo = deliveryPerson._id;
    stockRequest.assignedAt = new Date();
    stockRequest.status = 'Dispatched';
    await stockRequest.save();

    const updated = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('assignedTo', 'name email phone')
      .lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.togglePickedUp = async (req, res) => {
  try {
    const { id } = req.params;

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (String(stockRequest.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You are not assigned to this request' });
    }
    if (stockRequest.status !== 'Dispatched') {
      return res.status(400).json({ message: 'Only dispatched requests can be updated' });
    }

    stockRequest.pickedUp = !stockRequest.pickedUp;
    stockRequest.pickedUpAt = stockRequest.pickedUp ? new Date() : undefined;
    await stockRequest.save();

    const updated = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('assignedTo', 'name email phone')
      .lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleDelivered = async (req, res) => {
  try {
    const { id } = req.params;

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (String(stockRequest.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You are not assigned to this request' });
    }
    if (!['Dispatched', 'Delivered'].includes(stockRequest.status)) {
      return res.status(400).json({ message: 'Only dispatched or delivered requests can be updated' });
    }

    const isNowDelivered = stockRequest.status !== 'Delivered';
    stockRequest.status = isNowDelivered ? 'Delivered' : 'Dispatched';
    stockRequest.deliveredAt = isNowDelivered ? new Date() : undefined;
    await stockRequest.save();

    const updated = await StockRequest.findById(stockRequest._id)
      .populate('tenant', 'name email phone')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('assignedTo', 'name email phone')
      .lean();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateDeliveredTo = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveredTo } = req.body;

    const stockRequest = await StockRequest.findById(id);
    if (!stockRequest) {
      return res.status(404).json({ message: 'Stock request not found' });
    }
    if (String(stockRequest.assignedTo) !== String(req.user.id)) {
      return res.status(403).json({ message: 'You are not assigned to this request' });
    }

    stockRequest.deliveredTo = (deliveredTo || '').trim();
    await stockRequest.save();

    res.json({ deliveredTo: stockRequest.deliveredTo });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};