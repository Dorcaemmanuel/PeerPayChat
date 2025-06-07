import { describe, expect, it } from "vitest";

// Mock contract interface for testing
class MockP2PMessagingContract {
  constructor() {
    this.users = new Map();
    this.usernameRegistry = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.userChats = new Map();
    this.messagePayments = new Map();
    this.contacts = new Map();
    this.blockedUsers = new Map();
    this.userSettings = new Map();
    this.userStats = new Map();

    // Data variables
    this.nextMessageId = 1;
    this.nextChatId = 1;
    this.totalUsers = 0;
    this.totalMessages = 0;
    this.platformEarnings = 0;
    this.spamPreventionPool = 0;

    // Constants
    this.PLATFORM_FEE = 2;
    this.MIN_PAYMENT = 10000;
    this.MAX_PAYMENT = 100000000;
    this.MAX_MESSAGE_LENGTH = 500;
    this.MAX_USERNAME_LENGTH = 30;
    this.SPAM_PREVENTION_FEE = 1000;

    // Current block height simulation
    this.currentBlockHeight = 1000;
    this.currentSender = null;
  }

  // Helper to set transaction sender
  setTxSender(address) {
    this.currentSender = address;
  }

  // Error constants
  get ERR_NOT_AUTHORIZED() {
    return { error: 401 };
  }
  get ERR_USER_NOT_FOUND() {
    return { error: 402 };
  }
  get ERR_MESSAGE_NOT_FOUND() {
    return { error: 403 };
  }
  get ERR_INVALID_PAYMENT() {
    return { error: 404 };
  }
  get ERR_MESSAGE_TOO_LONG() {
    return { error: 405 };
  }
  get ERR_USERNAME_TAKEN() {
    return { error: 406 };
  }
  get ERR_INSUFFICIENT_FUNDS() {
    return { error: 407 };
  }
  get ERR_BLOCKED_USER() {
    return { error: 408 };
  }
  get ERR_INVALID_CHAT() {
    return { error: 409 };
  }
  get ERR_ALREADY_EXISTS() {
    return { error: 410 };
  }

  registerUser(
    username,
    displayName,
    bio,
    avatarHash,
    publicKey,
    messagePrice
  ) {
    const sender = this.currentSender;

    // Check if user already exists
    if (this.users.has(sender)) {
      return this.ERR_ALREADY_EXISTS;
    }

    // Check if username is taken
    if (this.usernameRegistry.has(username)) {
      return this.ERR_USERNAME_TAKEN;
    }

    // Validate inputs
    if (username.length === 0 || username.length > this.MAX_USERNAME_LENGTH) {
      return this.ERR_NOT_AUTHORIZED;
    }

    if (messagePrice < 0 || messagePrice > this.MAX_PAYMENT) {
      return this.ERR_INVALID_PAYMENT;
    }

    // Register user
    const userData = {
      username,
      displayName,
      bio,
      avatarHash,
      publicKey,
      messagePrice,
      totalReceived: 0,
      totalSent: 0,
      messageCount: 0,
      reputationScore: 100,
      isPremium: false,
      joinedAt: this.currentBlockHeight,
      lastActive: this.currentBlockHeight,
      status: "online",
    };

    this.users.set(sender, userData);
    this.usernameRegistry.set(username, { userAddress: sender });

    // Initialize user settings
    this.userSettings.set(sender, {
      allowMessagesFromStrangers: true,
      requirePaymentFromStrangers: false,
      autoDeleteMessages: false,
      messageRetentionDays: 30,
      notificationPreferences: 255,
      privacyLevel: 0,
      encryptionEnabled: false,
    });

    // Initialize user stats
    this.userStats.set(sender, {
      messagesSentToday: 0,
      messagesReceivedToday: 0,
      paymentsSentToday: 0,
      paymentsReceivedToday: 0,
      lastResetDay: Math.floor(this.currentBlockHeight / 144),
      spamReports: 0,
      qualityScore: 100,
    });

    this.totalUsers++;
    this.spamPreventionPool += this.SPAM_PREVENTION_FEE;

    return { ok: username };
  }

  updateProfile(displayName, bio, avatarHash, messagePrice, status) {
    const sender = this.currentSender;
    const userData = this.users.get(sender);

    if (!userData) {
      return this.ERR_USER_NOT_FOUND;
    }

    if (messagePrice < 0 || messagePrice > this.MAX_PAYMENT) {
      return this.ERR_INVALID_PAYMENT;
    }

    const updatedData = {
      ...userData,
      displayName,
      bio,
      avatarHash,
      messagePrice,
      status,
      lastActive: this.currentBlockHeight,
    };

    this.users.set(sender, updatedData);
    return { ok: true };
  }

  createOrGetChat(otherUser) {
    const sender = this.currentSender;

    if (sender === otherUser) {
      return this.ERR_NOT_AUTHORIZED;
    }

    if (!this.users.has(otherUser) || !this.users.has(sender)) {
      return this.ERR_USER_NOT_FOUND;
    }

    // Check if users are blocked
    const chatKey1 = `${sender}-${otherUser}`;
    const chatKey2 = `${otherUser}-${sender}`;

    if (this.blockedUsers.has(chatKey1) || this.blockedUsers.has(chatKey2)) {
      return this.ERR_BLOCKED_USER;
    }

    // Check for existing chat
    let existingChat =
      this.userChats.get(chatKey1) || this.userChats.get(chatKey2);

    if (existingChat) {
      return { ok: existingChat.chatId };
    }

    // Create new chat
    const chatId = this.nextChatId++;
    const chatData = {
      participant1: sender,
      participant2: otherUser,
      createdAt: this.currentBlockHeight,
      lastMessageAt: this.currentBlockHeight,
      messageCount: 0,
      totalPayments: 0,
      isActive: true,
    };

    this.chats.set(chatId, chatData);
    this.userChats.set(chatKey1, { chatId });
    this.userChats.set(chatKey2, { chatId });

    return { ok: chatId };
  }

  sendMessage(
    recipient,
    contentHash,
    messageType,
    paymentAmount,
    isEncrypted,
    replyTo,
    metadata
  ) {
    const sender = this.currentSender;
    const senderData = this.users.get(sender);
    const recipientData = this.users.get(recipient);

    if (!senderData || !recipientData) {
      return this.ERR_USER_NOT_FOUND;
    }

    if (sender === recipient) {
      return this.ERR_NOT_AUTHORIZED;
    }

    if (contentHash.length > 64) {
      return this.ERR_MESSAGE_TOO_LONG;
    }

    if (paymentAmount < 0 || paymentAmount > this.MAX_PAYMENT) {
      return this.ERR_INVALID_PAYMENT;
    }

    // Check if sender is blocked
    const blockKey = `${recipient}-${sender}`;
    if (this.blockedUsers.has(blockKey)) {
      return this.ERR_BLOCKED_USER;
    }

    // Create or get chat
    const chatResult = this.createOrGetChat(recipient);
    if (chatResult.error) {
      return chatResult;
    }
    const chatId = chatResult.ok;

    // Get recipient settings
    const recipientSettings = this.userSettings.get(recipient) || {
      allowMessagesFromStrangers: true,
      requirePaymentFromStrangers: false,
    };

    // Check if contact exists
    const contactKey = `${recipient}-${sender}`;
    const isContact = this.contacts.has(contactKey);

    // Calculate required payment
    const requiredPayment =
      !isContact && recipientSettings.requirePaymentFromStrangers
        ? recipientData.messagePrice
        : 0;

    const totalPayment = paymentAmount + requiredPayment;

    if (totalPayment > 0 && totalPayment < this.MIN_PAYMENT) {
      return this.ERR_INVALID_PAYMENT;
    }

    // Check stranger message permissions
    if (
      !isContact &&
      !recipientSettings.allowMessagesFromStrangers &&
      totalPayment === 0
    ) {
      return this.ERR_NOT_AUTHORIZED;
    }

    const messageId = this.nextMessageId++;
    const platformFee =
      totalPayment > 0
        ? Math.floor((totalPayment * this.PLATFORM_FEE) / 100)
        : 0;
    const netPayment = totalPayment - platformFee;

    // Create message
    const messageData = {
      chatId,
      sender,
      recipient,
      contentHash,
      messageType,
      paymentAmount: totalPayment,
      timestamp: this.currentBlockHeight,
      isRead: false,
      isEncrypted,
      replyTo,
      metadata,
    };

    this.messages.set(messageId, messageData);

    // Record payment if any
    if (totalPayment > 0) {
      this.messagePayments.set(messageId, {
        amount: totalPayment,
        sender,
        recipient,
        platformFee,
        paymentType: paymentAmount > 0 ? "tip" : "message-fee",
        processedAt: this.currentBlockHeight,
      });

      this.platformEarnings += platformFee;
    }

    // Update chat
    const chatData = this.chats.get(chatId);
    this.chats.set(chatId, {
      ...chatData,
      lastMessageAt: this.currentBlockHeight,
      messageCount: chatData.messageCount + 1,
      totalPayments: chatData.totalPayments + totalPayment,
    });

    // Update user stats
    this.users.set(sender, {
      ...senderData,
      totalSent: senderData.totalSent + totalPayment,
      messageCount: senderData.messageCount + 1,
      lastActive: this.currentBlockHeight,
    });

    this.users.set(recipient, {
      ...recipientData,
      totalReceived: recipientData.totalReceived + netPayment,
      lastActive: this.currentBlockHeight,
    });

    this.totalMessages++;

    return { ok: messageId };
  }

  markMessageRead(messageId) {
    const messageData = this.messages.get(messageId);

    if (!messageData) {
      return this.ERR_MESSAGE_NOT_FOUND;
    }

    if (this.currentSender !== messageData.recipient) {
      return this.ERR_NOT_AUTHORIZED;
    }

    this.messages.set(messageId, {
      ...messageData,
      isRead: true,
    });

    return { ok: true };
  }

  addContact(contactAddress, customName, notes) {
    const sender = this.currentSender;

    if (sender === contactAddress) {
      return this.ERR_NOT_AUTHORIZED;
    }

    if (!this.users.has(contactAddress)) {
      return this.ERR_USER_NOT_FOUND;
    }

    const contactKey = `${sender}-${contactAddress}`;
    this.contacts.set(contactKey, {
      addedAt: this.currentBlockHeight,
      isFavorite: false,
      customName,
      notes,
    });

    return { ok: true };
  }

  blockUser(userToBlock, reason) {
    const sender = this.currentSender;

    if (sender === userToBlock) {
      return this.ERR_NOT_AUTHORIZED;
    }

    if (!this.users.has(userToBlock)) {
      return this.ERR_USER_NOT_FOUND;
    }

    const blockKey = `${sender}-${userToBlock}`;
    this.blockedUsers.set(blockKey, {
      blockedAt: this.currentBlockHeight,
      reason,
    });

    return { ok: true };
  }

  unblockUser(userToUnblock) {
    const blockKey = `${this.currentSender}-${userToUnblock}`;

    if (!this.blockedUsers.has(blockKey)) {
      return this.ERR_USER_NOT_FOUND;
    }

    this.blockedUsers.delete(blockKey);
    return { ok: true };
  }

  withdrawEarnings(amount) {
    const sender = this.currentSender;
    const userData = this.users.get(sender);

    if (!userData) {
      return this.ERR_USER_NOT_FOUND;
    }

    if (amount <= 0) {
      return this.ERR_INVALID_PAYMENT;
    }

    if (amount > userData.totalReceived) {
      return this.ERR_INSUFFICIENT_FUNDS;
    }

    this.users.set(sender, {
      ...userData,
      totalReceived: userData.totalReceived - amount,
    });

    return { ok: true };
  }

  // Read-only functions
  getUser(userAddress) {
    return this.users.get(userAddress) || null;
  }

  getUserByUsername(username) {
    const registry = this.usernameRegistry.get(username);
    if (!registry) return null;
    return this.users.get(registry.userAddress) || null;
  }

  getChat(chatId) {
    return this.chats.get(chatId) || null;
  }

  getMessage(messageId) {
    return this.messages.get(messageId) || null;
  }

  getUserSettings(userAddress) {
    return this.userSettings.get(userAddress) || null;
  }

  isBlocked(user, blockedUser) {
    return this.blockedUsers.has(`${user}-${blockedUser}`);
  }

  getPlatformStats() {
    return {
      totalUsers: this.totalUsers,
      totalMessages: this.totalMessages,
      platformEarnings: this.platformEarnings,
      spamPreventionPool: this.spamPreventionPool,
      nextMessageId: this.nextMessageId,
      nextChatId: this.nextChatId,
    };
  }
}

// Test Suite
describe("P2P Messaging Contract", () => {
  let contract;
  const alice = "alice_address";
  const bob = "bob_address";
  const charlie = "charlie_address";

  beforeEach(() => {
    contract = new MockP2PMessagingContract();
  });

  describe("User Registration", () => {
    it("should register a new user successfully", () => {
      contract.setTxSender(alice);

      const result = contract.registerUser(
        "alice123",
        "Alice Smith",
        "Hello, I'm Alice!",
        "avatar_hash_123",
        "public_key_abc",
        50000
      );

      expect(result).toEqual({ ok: "alice123" });

      const userData = contract.getUser(alice);
      expect(userData).toBeTruthy();
      expect(userData.username).toBe("alice123");
      expect(userData.displayName).toBe("Alice Smith");
      expect(userData.messagePrice).toBe(50000);
      expect(userData.reputationScore).toBe(100);
      expect(userData.isPremium).toBe(false);
    });

    it("should reject duplicate username", () => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      const result = contract.registerUser(
        "alice123",
        "Bob",
        "Bio",
        "hash",
        "key",
        0
      );

      expect(result).toEqual(contract.ERR_USERNAME_TAKEN);
    });

    it("should reject duplicate user registration", () => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      const result = contract.registerUser(
        "alice456",
        "Alice2",
        "Bio2",
        "hash2",
        "key2",
        0
      );

      expect(result).toEqual(contract.ERR_ALREADY_EXISTS);
    });

    it("should reject invalid message price", () => {
      contract.setTxSender(alice);

      const result = contract.registerUser(
        "alice123",
        "Alice",
        "Bio",
        "hash",
        "key",
        contract.MAX_PAYMENT + 1
      );

      expect(result).toEqual(contract.ERR_INVALID_PAYMENT);
    });

    it("should reject empty username", () => {
      contract.setTxSender(alice);

      const result = contract.registerUser(
        "",
        "Alice",
        "Bio",
        "hash",
        "key",
        0
      );

      expect(result).toEqual(contract.ERR_NOT_AUTHORIZED);
    });
  });

  describe("Profile Management", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);
    });

    it("should update profile successfully", () => {
      const result = contract.updateProfile(
        "Alice Updated",
        "New bio",
        "new_hash",
        75000,
        "busy"
      );

      expect(result).toEqual({ ok: true });

      const userData = contract.getUser(alice);
      expect(userData.displayName).toBe("Alice Updated");
      expect(userData.bio).toBe("New bio");
      expect(userData.messagePrice).toBe(75000);
      expect(userData.status).toBe("busy");
    });

    it("should reject profile update for non-existent user", () => {
      contract.setTxSender(bob);

      const result = contract.updateProfile("Bob", "Bio", "hash", 0, "online");

      expect(result).toEqual(contract.ERR_USER_NOT_FOUND);
    });
  });

  describe("Chat Management", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 0);
    });

    it("should create a new chat between users", () => {
      contract.setTxSender(alice);

      const result = contract.createOrGetChat(bob);

      expect(result).toEqual({ ok: 1 });

      const chatData = contract.getChat(1);
      expect(chatData).toBeTruthy();
      expect(chatData.participant1).toBe(alice);
      expect(chatData.participant2).toBe(bob);
      expect(chatData.messageCount).toBe(0);
      expect(chatData.isActive).toBe(true);
    });

    it("should return existing chat if already exists", () => {
      contract.setTxSender(alice);
      const result1 = contract.createOrGetChat(bob);

      contract.setTxSender(bob);
      const result2 = contract.createOrGetChat(alice);

      expect(result1).toEqual(result2);
      expect(result1).toEqual({ ok: 1 });
    });

    it("should reject chat creation with self", () => {
      contract.setTxSender(alice);

      const result = contract.createOrGetChat(alice);

      expect(result).toEqual(contract.ERR_NOT_AUTHORIZED);
    });

    it("should reject chat with non-existent user", () => {
      contract.setTxSender(alice);

      const result = contract.createOrGetChat(charlie);

      expect(result).toEqual(contract.ERR_USER_NOT_FOUND);
    });
  });

  describe("Message Sending", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 25000);
    });

    it("should send a free message successfully", () => {
      contract.setTxSender(alice);

      const result = contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        0,
        false,
        null,
        "metadata"
      );

      expect(result).toEqual({ ok: 1 });

      const messageData = contract.getMessage(1);
      expect(messageData).toBeTruthy();
      expect(messageData.sender).toBe(alice);
      expect(messageData.recipient).toBe(bob);
      expect(messageData.contentHash).toBe("content_hash_123");
      expect(messageData.paymentAmount).toBe(0);
      expect(messageData.isRead).toBe(false);
    });

    it("should send a paid message successfully", () => {
      contract.setTxSender(alice);

      const result = contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        15000,
        false,
        null,
        "tip message"
      );

      expect(result).toEqual({ ok: 1 });

      const messageData = contract.getMessage(1);
      expect(messageData.paymentAmount).toBe(15000);

      const paymentData = contract.messagePayments.get(1);
      expect(paymentData).toBeTruthy();
      expect(paymentData.amount).toBe(15000);
      expect(paymentData.paymentType).toBe("tip");
      expect(paymentData.platformFee).toBe(300); // 2% of 15000
    });

    it("should require payment from strangers when setting enabled", () => {
      // Set Bob's settings to require payment from strangers
      contract.setTxSender(bob);
      contract.userSettings.set(bob, {
        allowMessagesFromStrangers: true,
        requirePaymentFromStrangers: true,
        autoDeleteMessages: false,
        messageRetentionDays: 30,
        notificationPreferences: 255,
        privacyLevel: 0,
        encryptionEnabled: false,
      });

      contract.setTxSender(alice);

      const result = contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        0,
        false,
        null,
        "metadata"
      );

      expect(result).toEqual({ ok: 1 });

      const messageData = contract.getMessage(1);
      expect(messageData.paymentAmount).toBe(25000); // Bob's message price

      const paymentData = contract.messagePayments.get(1);
      expect(paymentData.paymentType).toBe("message-fee");
    });

    it("should reject message to blocked user", () => {
      contract.setTxSender(bob);
      contract.blockUser(alice, "spam");

      contract.setTxSender(alice);

      const result = contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        0,
        false,
        null,
        "metadata"
      );

      expect(result).toEqual(contract.ERR_BLOCKED_USER);
    });

    it("should reject message with invalid payment amount", () => {
      contract.setTxSender(alice);

      const result = contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        contract.MAX_PAYMENT + 1,
        false,
        null,
        "metadata"
      );

      expect(result).toEqual(contract.ERR_INVALID_PAYMENT);
    });

    it("should reject message with too long content hash", () => {
      contract.setTxSender(alice);

      const longHash = "a".repeat(65);

      const result = contract.sendMessage(
        bob,
        longHash,
        "text",
        0,
        false,
        null,
        "metadata"
      );

      expect(result).toEqual(contract.ERR_MESSAGE_TOO_LONG);
    });
  });

  describe("Message Reading", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 0);

      contract.setTxSender(alice);
      contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        0,
        false,
        null,
        "metadata"
      );
    });

    it("should mark message as read by recipient", () => {
      contract.setTxSender(bob);

      const result = contract.markMessageRead(1);

      expect(result).toEqual({ ok: true });

      const messageData = contract.getMessage(1);
      expect(messageData.isRead).toBe(true);
    });

    it("should reject marking message as read by non-recipient", () => {
      contract.setTxSender(alice);

      const result = contract.markMessageRead(1);

      expect(result).toEqual(contract.ERR_NOT_AUTHORIZED);
    });

    it("should reject marking non-existent message as read", () => {
      contract.setTxSender(bob);

      const result = contract.markMessageRead(999);

      expect(result).toEqual(contract.ERR_MESSAGE_NOT_FOUND);
    });
  });

  describe("Contact Management", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 0);
    });

    it("should add contact successfully", () => {
      contract.setTxSender(alice);

      const result = contract.addContact(bob, "My Friend Bob", "College buddy");

      expect(result).toEqual({ ok: true });

      const contactKey = `${alice}-${bob}`;
      const contactData = contract.contacts.get(contactKey);
      expect(contactData).toBeTruthy();
      expect(contactData.customName).toBe("My Friend Bob");
      expect(contactData.notes).toBe("College buddy");
      expect(contactData.isFavorite).toBe(false);
    });

    it("should reject adding self as contact", () => {
      contract.setTxSender(alice);

      const result = contract.addContact(alice, "Myself", "Notes");

      expect(result).toEqual(contract.ERR_NOT_AUTHORIZED);
    });

    it("should reject adding non-existent user as contact", () => {
      contract.setTxSender(alice);

      const result = contract.addContact(charlie, "Charlie", "Notes");

      expect(result).toEqual(contract.ERR_USER_NOT_FOUND);
    });
  });

  describe("User Blocking", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 0);
    });

    it("should block user successfully", () => {
      contract.setTxSender(alice);

      const result = contract.blockUser(bob, "Spam messages");

      expect(result).toEqual({ ok: true });

      const isBlocked = contract.isBlocked(alice, bob);
      expect(isBlocked).toBe(true);
    });

    it("should unblock user successfully", () => {
      contract.setTxSender(alice);
      contract.blockUser(bob, "Spam messages");

      const result = contract.unblockUser(bob);

      expect(result).toEqual({ ok: true });

      const isBlocked = contract.isBlocked(alice, bob);
      expect(isBlocked).toBe(false);
    });

    it("should reject blocking self", () => {
      contract.setTxSender(alice);

      const result = contract.blockUser(alice, "Self block");

      expect(result).toEqual(contract.ERR_NOT_AUTHORIZED);
    });

    it("should reject unblocking non-blocked user", () => {
      contract.setTxSender(alice);

      const result = contract.unblockUser(bob);

      expect(result).toEqual(contract.ERR_USER_NOT_FOUND);
    });
  });

  describe("Earnings Management", () => {
    beforeEach(() => {
      contract.setTxSender(alice);
      contract.registerUser("alice123", "Alice", "Bio", "hash", "key", 0);

      contract.setTxSender(bob);
      contract.registerUser("bob123", "Bob", "Bio", "hash", "key", 25000);

      // Alice sends paid message to Bob
      contract.setTxSender(alice);
      contract.sendMessage(
        bob,
        "content_hash_123",
        "text",
        50000,
        false,
        null,
        "tip"
      );
    });

    it("should withdraw earnings successfully", () => {
      contract.setTxSender(bob);

      const bobData = contract.getUser(bob);
      const initialEarnings = bobData.totalReceived;
      expect(initialEarnings).toBeGreaterThan(0);

      const result = contract.withdrawEarnings(25000);

      expect(result).toEqual({ ok: true });
    });
  });
});
