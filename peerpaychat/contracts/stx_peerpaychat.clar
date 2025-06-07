;; Peer-to-Peer Messaging with Micropayments
;; A decentralized messaging platform with integrated micropayments

;; Constants
(define-constant CONTRACT-OWNER tx-sender)
(define-constant PLATFORM-FEE u2) ;; 2% platform fee on payments
(define-constant MIN-PAYMENT u10000) ;; 0.01 STX minimum payment
(define-constant MAX-PAYMENT u100000000) ;; 100 STX maximum payment
(define-constant MAX-MESSAGE-LENGTH u500)
(define-constant MAX-USERNAME-LENGTH u30)
(define-constant SPAM-PREVENTION-FEE u1000) ;; 0.001 STX anti-spam fee

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-USER-NOT-FOUND (err u402))
(define-constant ERR-MESSAGE-NOT-FOUND (err u403))
(define-constant ERR-INVALID-PAYMENT (err u404))
(define-constant ERR-MESSAGE-TOO-LONG (err u405))
(define-constant ERR-USERNAME-TAKEN (err u406))
(define-constant ERR-INSUFFICIENT-FUNDS (err u407))
(define-constant ERR-BLOCKED-USER (err u408))
(define-constant ERR-INVALID-CHAT (err u409))
(define-constant ERR-ALREADY-EXISTS (err u410))

;; Data variables
(define-data-var next-message-id uint u1)
(define-data-var next-chat-id uint u1)
(define-data-var total-users uint u0)
(define-data-var total-messages uint u0)
(define-data-var platform-earnings uint u0)
(define-data-var spam-prevention-pool uint u0)

;; User management
(define-map users
  { user-address: principal }
  {
    username: (string-ascii 30),
    display-name: (string-ascii 50),
    bio: (string-ascii 200),
    avatar-hash: (string-ascii 64),
    public-key: (string-ascii 128),
    message-price: uint, ;; Price others pay to message this user
    total-received: uint,
    total-sent: uint,
    message-count: uint,
    reputation-score: uint,
    is-premium: bool,
    joined-at: uint,
    last-active: uint,
    status: (string-ascii 20) ;; online, offline, away, busy
  }
)

(define-map username-registry
  { username: (string-ascii 30) }
  { user-address: principal }
)

;; Chat management
(define-map chats
  { chat-id: uint }
  {
    participant-1: principal,
    participant-2: principal,
    created-at: uint,
    last-message-at: uint,
    message-count: uint,
    total-payments: uint,
    is-active: bool
  }
)

(define-map user-chats
  { user: principal, other-user: principal }
  { chat-id: uint }
)

;; Messages
(define-map messages
  { message-id: uint }
  {
    chat-id: uint,
    sender: principal,
    recipient: principal,
    content-hash: (string-ascii 64), ;; IPFS hash or encrypted content hash
    message-type: (string-ascii 20), ;; text, image, file, payment, system
    payment-amount: uint,
    timestamp: uint,
    is-read: bool,
    is-encrypted: bool,
    reply-to: (optional uint), ;; Reply to message ID
    metadata: (string-ascii 200) ;; Additional data like file info
  }
)

;; Message payments and tips
(define-map message-payments
  { message-id: uint }
  {
    amount: uint,
    sender: principal,
    recipient: principal,
    platform-fee: uint,
    payment-type: (string-ascii 20), ;; tip, message-fee, reward
    processed-at: uint
  }
)

;; User relationships
(define-map contacts
  { user: principal, contact: principal }
  {
    added-at: uint,
    is-favorite: bool,
    custom-name: (string-ascii 50),
    notes: (string-ascii 200)
  }
)

(define-map blocked-users
  { user: principal, blocked-user: principal }
  {
    blocked-at: uint,
    reason: (string-ascii 100)
  }
)

;; User settings and preferences
(define-map user-settings
  { user: principal }
  {
    allow-messages-from-strangers: bool,
    require-payment-from-strangers: bool,
    auto-delete-messages: bool,
    message-retention-days: uint,
    notification-preferences: uint, ;; Bitfield for different notification types
    privacy-level: uint, ;; 0=public, 1=contacts-only, 2=private
    encryption-enabled: bool
  }
)

;; Analytics and statistics
(define-map user-stats
  { user: principal }
  {
    messages-sent-today: uint,
    messages-received-today: uint,
    payments-sent-today: uint,
    payments-received-today: uint,
    last-reset-day: uint,
    spam-reports: uint,
    quality-score: uint
  }
)

;; User registration and profile management
(define-public (register-user 
  (username (string-ascii 30))
  (display-name (string-ascii 50))
  (bio (string-ascii 200))
  (avatar-hash (string-ascii 64))
  (public-key (string-ascii 128))
  (message-price uint)
)
  (let
    (
      (existing-user (map-get? users { user-address: tx-sender }))
      (username-taken (map-get? username-registry { username: username }))
    )
    (asserts! (is-none existing-user) ERR-ALREADY-EXISTS)
    (asserts! (is-none username-taken) ERR-USERNAME-TAKEN)
    (asserts! (> (len username) u0) ERR-NOT-AUTHORIZED)
    (asserts! (<= (len username) MAX-USERNAME-LENGTH) ERR-NOT-AUTHORIZED)
    (asserts! (and (>= message-price u0) (<= message-price MAX-PAYMENT)) ERR-INVALID-PAYMENT)
    
    ;; Pay spam prevention fee
    (if (> SPAM-PREVENTION-FEE u0)
      (begin
        (try! (stx-transfer? SPAM-PREVENTION-FEE tx-sender (as-contract tx-sender)))
        (var-set spam-prevention-pool (+ (var-get spam-prevention-pool) SPAM-PREVENTION-FEE))
      )
      true
    )
    
    ;; Register user
    (map-set users
      { user-address: tx-sender }
      {
        username: username,
        display-name: display-name,
        bio: bio,
        avatar-hash: avatar-hash,
        public-key: public-key,
        message-price: message-price,
        total-received: u0,
        total-sent: u0,
        message-count: u0,
        reputation-score: u100, ;; Start with neutral reputation
        is-premium: false,
        joined-at: stacks-block-height,
        last-active: stacks-block-height,
        status: "online"
      }
    )
    
    ;; Register username
    (map-set username-registry
      { username: username }
      { user-address: tx-sender }
    )
    
    ;; Initialize user settings
    (map-set user-settings
      { user: tx-sender }
      {
        allow-messages-from-strangers: true,
        require-payment-from-strangers: false,
        auto-delete-messages: false,
        message-retention-days: u30,
        notification-preferences: u255, ;; All notifications enabled
        privacy-level: u0, ;; Public
        encryption-enabled: false
      }
    )
    
    ;; Initialize user stats
    (map-set user-stats
      { user: tx-sender }
      {
        messages-sent-today: u0,
        messages-received-today: u0,
        payments-sent-today: u0,
        payments-received-today: u0,
        last-reset-day: (/ stacks-block-height u144), ;; Assuming 144 blocks per day
        spam-reports: u0,
        quality-score: u100
      }
    )
    
    (var-set total-users (+ (var-get total-users) u1))
    (ok username)
  )
)

(define-public (update-profile
  (display-name (string-ascii 50))
  (bio (string-ascii 200))
  (avatar-hash (string-ascii 64))
  (message-price uint)
  (status (string-ascii 20))
)
  (let
    (
      (user-data (unwrap! (map-get? users { user-address: tx-sender }) ERR-USER-NOT-FOUND))
    )
    (asserts! (and (>= message-price u0) (<= message-price MAX-PAYMENT)) ERR-INVALID-PAYMENT)
    
    (map-set users
      { user-address: tx-sender }
      (merge user-data {
        display-name: display-name,
        bio: bio,
        avatar-hash: avatar-hash,
        message-price: message-price,
        status: status,
        last-active: stacks-block-height
      })
    )
    
    (ok true)
  )
)

;; Chat management
(define-public (create-or-get-chat (other-user principal))
  (let
    (
      (existing-chat (map-get? user-chats { user: tx-sender, other-user: other-user }))
      (reverse-chat (map-get? user-chats { user: other-user, other-user: tx-sender }))
    )
    (asserts! (not (is-eq tx-sender other-user)) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (map-get? users { user-address: other-user })) ERR-USER-NOT-FOUND)
    (asserts! (is-some (map-get? users { user-address: tx-sender })) ERR-USER-NOT-FOUND)
    
    ;; Check if either user has blocked the other
    (asserts! (is-none (map-get? blocked-users { user: tx-sender, blocked-user: other-user })) ERR-BLOCKED-USER)
    (asserts! (is-none (map-get? blocked-users { user: other-user, blocked-user: tx-sender })) ERR-BLOCKED-USER)
    
    (match existing-chat
      chat-info (ok (get chat-id chat-info))
      (match reverse-chat
        reverse-info (begin
          ;; Add mapping for current user
          (map-set user-chats
            { user: tx-sender, other-user: other-user }
            { chat-id: (get chat-id reverse-info) }
          )
          (ok (get chat-id reverse-info))
        )
        ;; Create new chat
        (let
          (
            (chat-id (var-get next-chat-id))
          )
          (map-set chats
            { chat-id: chat-id }
            {
              participant-1: tx-sender,
              participant-2: other-user,
              created-at: stacks-block-height,
              last-message-at: stacks-block-height,
              message-count: u0,
              total-payments: u0,
              is-active: true
            }
          )
          
          (map-set user-chats
            { user: tx-sender, other-user: other-user }
            { chat-id: chat-id }
          )
          
          (map-set user-chats
            { user: other-user, other-user: tx-sender }
            { chat-id: chat-id }
          )
          
          (var-set next-chat-id (+ chat-id u1))
          (ok chat-id)
        )
      )
    )
  )
)

;; Message sending with optional payment
(define-public (send-message
  (recipient principal)
  (content-hash (string-ascii 64))
  (message-type (string-ascii 20))
  (payment-amount uint)
  (is-encrypted bool)
  (reply-to (optional uint))
  (metadata (string-ascii 200))
)
  (let
    (
      (sender-data (unwrap! (map-get? users { user-address: tx-sender }) ERR-USER-NOT-FOUND))
      (recipient-data (unwrap! (map-get? users { user-address: recipient }) ERR-USER-NOT-FOUND))
      (recipient-settings (default-to
        {
          allow-messages-from-strangers: true,
          require-payment-from-strangers: false,
          auto-delete-messages: false,
          message-retention-days: u30,
          notification-preferences: u255,
          privacy-level: u0,
          encryption-enabled: false
        }
        (map-get? user-settings { user: recipient })
      ))
      (chat-id (try! (create-or-get-chat recipient)))
      (message-id (var-get next-message-id))
      (is-contact (is-some (map-get? contacts { user: recipient, contact: tx-sender })))
      (required-payment (if (and (not is-contact) (get require-payment-from-strangers recipient-settings))
        (get message-price recipient-data)
        u0
      ))
      (total-payment (+ payment-amount required-payment))
      (platform-fee (if (> total-payment u0) (/ (* total-payment PLATFORM-FEE) u100) u0))
      (net-payment (- total-payment platform-fee))
    )
    (asserts! (not (is-eq tx-sender recipient)) ERR-NOT-AUTHORIZED)
    (asserts! (<= (len content-hash) u64) ERR-MESSAGE-TOO-LONG)
    (asserts! (and (>= total-payment u0) (<= total-payment MAX-PAYMENT)) ERR-INVALID-PAYMENT)
    
    ;; Check if sender is blocked
    (asserts! (is-none (map-get? blocked-users { user: recipient, blocked-user: tx-sender })) ERR-BLOCKED-USER)
    
    ;; Check if stranger messages are allowed
    (if (and (not is-contact) (not (get allow-messages-from-strangers recipient-settings)))
      (asserts! (> total-payment u0) ERR-NOT-AUTHORIZED)
      true
    )
    
    ;; Process payment if required
    (if (> total-payment u0)
      (begin
        (asserts! (>= total-payment MIN-PAYMENT) ERR-INVALID-PAYMENT)
        (try! (stx-transfer? total-payment tx-sender (as-contract tx-sender)))
        
        ;; Record payment
        (map-set message-payments
          { message-id: message-id }
          {
            amount: total-payment,
            sender: tx-sender,
            recipient: recipient,
            platform-fee: platform-fee,
            payment-type: (if (> payment-amount u0) "tip" "message-fee"),
            processed-at: stacks-block-height
          }
        )
        
        ;; Update platform earnings
        (var-set platform-earnings (+ (var-get platform-earnings) platform-fee))
      )
      true
    )
    
    ;; Create message
    (map-set messages
      { message-id: message-id }
      {
        chat-id: chat-id,
        sender: tx-sender,
        recipient: recipient,
        content-hash: content-hash,
        message-type: message-type,
        payment-amount: total-payment,
        timestamp: stacks-block-height,
        is-read: false,
        is-encrypted: is-encrypted,
        reply-to: reply-to,
        metadata: metadata
      }
    )
    
    ;; Update chat
    (let
      (
        (chat-data (unwrap! (map-get? chats { chat-id: chat-id }) ERR-INVALID-CHAT))
      )
      (map-set chats
        { chat-id: chat-id }
        (merge chat-data {
          last-message-at: stacks-block-height,
          message-count: (+ (get message-count chat-data) u1),
          total-payments: (+ (get total-payments chat-data) total-payment)
        })
      )
    )
    
    ;; Update user stats
    (map-set users
      { user-address: tx-sender }
      (merge sender-data {
        total-sent: (+ (get total-sent sender-data) total-payment),
        message-count: (+ (get message-count sender-data) u1),
        last-active: stacks-block-height
      })
    )
    
    (map-set users
      { user-address: recipient }
      (merge recipient-data {
        total-received: (+ (get total-received recipient-data) net-payment),
        last-active: stacks-block-height
      })
    )
    
    (var-set next-message-id (+ message-id u1))
    (var-set total-messages (+ (var-get total-messages) u1))
    
    (ok message-id)
  )
)

;; Mark message as read
(define-public (mark-message-read (message-id uint))
  (let
    (
      (message-data (unwrap! (map-get? messages { message-id: message-id }) ERR-MESSAGE-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender (get recipient message-data)) ERR-NOT-AUTHORIZED)
    
    (map-set messages
      { message-id: message-id }
      (merge message-data { is-read: true })
    )
    
    (ok true)
  )
)

;; Contact management
(define-public (add-contact 
  (contact-address principal)
  (custom-name (string-ascii 50))
  (notes (string-ascii 200))
)
  (begin
    (asserts! (not (is-eq tx-sender contact-address)) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (map-get? users { user-address: contact-address })) ERR-USER-NOT-FOUND)
    
    (map-set contacts
      { user: tx-sender, contact: contact-address }
      {
        added-at: stacks-block-height,
        is-favorite: false,
        custom-name: custom-name,
        notes: notes
      }
    )
    
    (ok true)
  )
)

(define-public (block-user (user-to-block principal) (reason (string-ascii 100)))
  (begin
    (asserts! (not (is-eq tx-sender user-to-block)) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (map-get? users { user-address: user-to-block })) ERR-USER-NOT-FOUND)
    
    (map-set blocked-users
      { user: tx-sender, blocked-user: user-to-block }
      {
        blocked-at: stacks-block-height,
        reason: reason
      }
    )
    
    (ok true)
  )
)

(define-public (unblock-user (user-to-unblock principal))
  (begin
    (asserts! (is-some (map-get? blocked-users { user: tx-sender, blocked-user: user-to-unblock })) ERR-USER-NOT-FOUND)
    
    (map-delete blocked-users { user: tx-sender, blocked-user: user-to-unblock })
    
    (ok true)
  )
)

;; Settings management
(define-public (update-settings
  (allow-strangers bool)
  (require-payment bool)
  (auto-delete bool)
  (retention-days uint)
  (privacy-level uint)
  (encryption-enabled bool)
)
  (let
    (
      (current-settings (default-to
        {
          allow-messages-from-strangers: true,
          require-payment-from-strangers: false,
          auto-delete-messages: false,
          message-retention-days: u30,
          notification-preferences: u255,
          privacy-level: u0,
          encryption-enabled: false
        }
        (map-get? user-settings { user: tx-sender })
      ))
    )
    (asserts! (is-some (map-get? users { user-address: tx-sender })) ERR-USER-NOT-FOUND)
    (asserts! (<= privacy-level u2) ERR-NOT-AUTHORIZED)
    (asserts! (and (>= retention-days u1) (<= retention-days u365)) ERR-NOT-AUTHORIZED)
    
    (map-set user-settings
      { user: tx-sender }
      (merge current-settings {
        allow-messages-from-strangers: allow-strangers,
        require-payment-from-strangers: require-payment,
        auto-delete-messages: auto-delete,
        message-retention-days: retention-days,
        privacy-level: privacy-level,
        encryption-enabled: encryption-enabled
      })
    )
    
    (ok true)
  )
)

;; Earnings withdrawal
(define-public (withdraw-earnings (amount uint))
  (let
    (
      (user-data (unwrap! (map-get? users { user-address: tx-sender }) ERR-USER-NOT-FOUND))
      (available-balance (get total-received user-data))
    )
    (asserts! (> amount u0) ERR-INVALID-PAYMENT)
    (asserts! (<= amount available-balance) ERR-INSUFFICIENT-FUNDS)
    
    ;; Transfer earnings to user
    (try! (as-contract (stx-transfer? amount tx-sender (get user-address { user-address: tx-sender }))))
    
    ;; Update user balance
    (map-set users
      { user-address: tx-sender }
      (merge user-data {
        total-received: (- available-balance amount)
      })
    )
    
    (ok true)
  )
)

;; Admin functions
(define-public (withdraw-platform-fees)
  (let
    (
      (fees (var-get platform-earnings))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (> fees u0) ERR-INSUFFICIENT-FUNDS)
    
    (try! (as-contract (stx-transfer? fees tx-sender CONTRACT-OWNER)))
    (var-set platform-earnings u0)
    
    (ok fees)
  )
)

(define-public (set-premium-status (user-address principal) (is-premium bool))
  (let
    (
      (user-data (unwrap! (map-get? users { user-address: user-address }) ERR-USER-NOT-FOUND))
    )
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    
    (map-set users
      { user-address: user-address }
      (merge user-data { is-premium: is-premium })
    )
    
    (ok true)
  )
)

;; Read-only functions
(define-read-only (get-user (user-address principal))
  (map-get? users { user-address: user-address })
)

(define-read-only (get-user-by-username (username (string-ascii 30)))
  (match (map-get? username-registry { username: username })
    registry-entry (map-get? users { user-address: (get user-address registry-entry) })
    none
  )
)

(define-read-only (get-chat (chat-id uint))
  (map-get? chats { chat-id: chat-id })
)

(define-read-only (get-message (message-id uint))
  (map-get? messages { message-id: message-id })
)

(define-read-only (get-user-settings (user-address principal))
  (map-get? user-settings { user: user-address })
)

(define-read-only (get-contact (user principal) (contact principal))
  (map-get? contacts { user: user, contact: contact })
)

(define-read-only (is-blocked (user principal) (blocked-user principal))
  (is-some (map-get? blocked-users { user: user, blocked-user: blocked-user }))
)

(define-read-only (get-user-chat (user principal) (other-user principal))
  (map-get? user-chats { user: user, other-user: other-user })
)

(define-read-only (get-message-payment (message-id uint))
  (map-get? message-payments { message-id: message-id })
)

(define-read-only (get-platform-stats)
  {
    total-users: (var-get total-users),
    total-messages: (var-get total-messages),
    platform-earnings: (var-get platform-earnings),
    spam-prevention-pool: (var-get spam-prevention-pool),
    next-message-id: (var-get next-message-id),
    next-chat-id: (var-get next-chat-id)
  }
)

(define-read-only (get-user-stats (user-address principal))
  (map-get? user-stats { user: user-address })
)

;; Initialize contract
(begin
  (print "P2P Messaging with Micropayments Platform initialized")
  (print "Ready for secure, paid messaging")
)