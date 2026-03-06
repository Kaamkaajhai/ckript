import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// @desc    Get user transactions
// @route   GET /api/transactions
// @access  Private
export const getUserTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    
    const query = { user: req.user._id };
    
    if (type) query.type = type;
    if (status) query.status = status;
    
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('relatedScript', 'title')
      .populate('relatedProject', 'title');
    
    const total = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/transactions/:id
// @access  Private
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user._id
    })
      .populate('relatedScript', 'title')
      .populate('relatedProject', 'title');
    
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get wallet balance
// @route   GET /api/transactions/wallet/balance
// @access  Private
export const getWalletBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wallet');
    res.json(user.wallet || { balance: 0, currency: 'USD', pendingBalance: 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Request withdrawal
// @route   POST /api/transactions/withdraw
// @access  Private
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }
    
    const user = await User.findById(req.user._id);
    
    if (!user.wallet || user.wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }
    
    if (!user.bankDetails || !user.bankDetails.accountNumber) {
      return res.status(400).json({ 
        message: "Please add your bank details before requesting a withdrawal" 
      });
    }
    
    // Create withdrawal transaction
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "withdrawal",
      amount: -amount,
      status: "pending",
      description: `Withdrawal request to ${user.bankDetails.bankName || 'bank account'}`,
      reference: Transaction.generateReference('withdrawal'),
      paymentMethod: "bank_transfer",
      bankTransferDetails: {
        accountNumber: user.bankDetails.accountNumber,
        routingNumber: user.bankDetails.routingNumber,
        bankName: user.bankDetails.bankName,
        accountHolderName: user.bankDetails.accountHolderName
      },
      balanceBefore: user.wallet.balance,
      balanceAfter: user.wallet.balance - amount
    });
    
    // Update user wallet (move to pending)
    user.wallet.balance -= amount;
    user.wallet.pendingBalance = (user.wallet.pendingBalance || 0) + amount;
    await user.save();
    
    res.status(201).json({ 
      message: "Withdrawal request submitted successfully",
      transaction 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update bank details
// @route   PUT /api/transactions/bank-details
// @access  Private
export const updateBankDetails = async (req, res) => {
  try {
    const {
      accountHolderName,
      bankName,
      accountNumber,
      routingNumber,
      accountType,
      swiftCode,
      iban,
      country,
      currency
    } = req.body;
    
    const user = await User.findById(req.user._id);
    
    user.bankDetails = {
      accountHolderName,
      bankName,
      accountNumber,
      routingNumber,
      accountType: accountType || 'checking',
      swiftCode,
      iban,
      country: country || 'US',
      currency: currency || 'USD',
      isVerified: false, // Reset verification on update
      addedAt: user.bankDetails?.addedAt || new Date()
    };
    
    await user.save();
    
    // Return sanitized bank details (hide full account number)
    const sanitizedDetails = {
      ...user.bankDetails.toObject(),
      accountNumber: '****' + accountNumber.slice(-4)
    };
    
    res.json({ 
      message: "Bank details updated successfully",
      bankDetails: sanitizedDetails 
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get bank details
// @route   GET /api/transactions/bank-details
// @access  Private
export const getBankDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('bankDetails');
    
    if (!user.bankDetails || !user.bankDetails.accountNumber) {
      return res.json({ bankDetails: null });
    }
    
    // Return sanitized bank details
    const sanitizedDetails = {
      ...user.bankDetails.toObject(),
      accountNumber: '****' + user.bankDetails.accountNumber.slice(-4)
    };
    
    res.json({ bankDetails: sanitizedDetails });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
export const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get total earnings
    const earnings = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          type: { $in: ['credit', 'bonus', 'commission'] },
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // Get total spending
    const spending = await Transaction.aggregate([
      { 
        $match: { 
          user: userId, 
          type: { $in: ['debit', 'payment', 'subscription'] },
          status: 'completed'
        } 
      },
      { $group: { _id: null, total: { $sum: { $abs: '$amount' } } } }
    ]);
    
    // Get pending transactions
    const pending = await Transaction.countDocuments({
      user: userId,
      status: 'pending'
    });
    
    // Recent transactions
    const recent = await Transaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.json({
      totalEarnings: earnings[0]?.total || 0,
      totalSpending: spending[0]?.total || 0,
      pendingTransactions: pending,
      recentTransactions: recent
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
