const db = require("./db");
const { sendText, sendButtons } = require("./whatsapp");

async function getOrCreateRider(phone) {
  const existing = await db.query("SELECT * FROM riders WHERE phone = $1", [phone]);
  if (existing.rows[0]) return existing.rows[0];

  const created = await db.query(
    "INSERT INTO riders (phone) VALUES ($1) RETURNING *",
    [phone]
  );
  return created.rows[0];
}

async function getState(phone) {
  const result = await db.query("SELECT * FROM conversation_states WHERE phone = $1", [phone]);
  return result.rows[0];
}

async function setState(phone, role, state, rideId = null, tempData = {}) {
  await db.query(
    `
    INSERT INTO conversation_states (phone, role, state, ride_id, temp_data, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (phone)
    DO UPDATE SET role = $2, state = $3, ride_id = $4, temp_data = $5, updated_at = NOW()
    `,
    [phone, role, state, rideId, tempData]
  );
}

function formatRideSummary(ride) {
  return [
    "Please confirm your ride details:",
    "",
    `Name: ${ride.rider_name || ""}`,
    `Pickup: ${ride.pickup_location || ""}`,
    `Drop-off: ${ride.dropoff_location || ""}`,
    `Time: ${ride.pickup_time || ""}`,
    `Passengers: ${ride.passengers || ""}`,
    `Vehicle: ${ride.vehicle_type || ""}`,
    `Notes: ${ride.notes || "None"}`,
    "",
    "Reply YES to confirm or EDIT to change."
  ].join("\n");
}

async function createDraftRide(phone) {
  const rider = await getOrCreateRider(phone);
  const result = await db.query(
    `
    INSERT INTO rides (rider_id, rider_phone, status)
    VALUES ($1, $2, 'draft')
    RETURNING *
    `,
    [rider.id, phone]
  );
  return result.rows[0];
}

async function updateRideField(rideId, field, value) {
  const allowed = [
    "rider_name",
    "pickup_location",
    "dropoff_location",
    "pickup_time",
    "passengers",
    "vehicle_type",
    "notes"
  ];

  if (!allowed.includes(field)) throw new Error("Invalid ride field");

  const result = await db.query(
    `UPDATE rides SET ${field} = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [value, rideId]
  );

  return result.rows[0];
}

async function getRide(rideId) {
  const result = await db.query("SELECT * FROM rides WHERE id = $1", [rideId]);
  return result.rows[0];
}

async function confirmRide(rideId) {
  const result = await db.query(
    "UPDATE rides SET status = 'sent_to_drivers', updated_at = NOW() WHERE id = $1 RETURNING *",
    [rideId]
  );
  const ride = result.rows[0];

  await broadcastRideToDrivers(ride);
  return ride;
}

async function broadcastRideToDrivers(ride) {
  const drivers = await db.query("SELECT * FROM drivers WHERE status = 'available'");

  for (const driver of drivers.rows) {
    const message = [
      "New ride request 🚗",
      "",
      `Ride ID: ${ride.id}`,
      `Pickup: ${ride.pickup_location}`,
      `Drop-off: ${ride.dropoff_location}`,
      `Time: ${ride.pickup_time}`,
      `Passengers: ${ride.passengers}`,
      `Vehicle: ${ride.vehicle_type}`,
      `Notes: ${ride.notes || "None"}`,
      "",
      "Press ACCEPT to take this ride."
    ].join("\n");

    await sendButtons(driver.phone, message, [
      { id: `ACCEPT_${ride.id}`, title: "ACCEPT" },
      { id: `DECLINE_${ride.id}`, title: "DECLINE" }
    ]);
  }
}

async function acceptRide(rideId, driverPhone) {
  const driverResult = await db.query("SELECT * FROM drivers WHERE phone = $1", [driverPhone]);
  const driver = driverResult.rows[0];

  if (!driver) {
    await sendText(driverPhone, "You are not registered as a driver.");
    return;
  }

  const result = await db.query(
    `
    UPDATE rides
    SET status = 'accepted_by_driver',
        assigned_driver_id = $1,
        updated_at = NOW()
    WHERE id = $2
      AND status = 'sent_to_drivers'
      AND assigned_driver_id IS NULL
    RETURNING *
    `,
    [driver.id, rideId]
  );

  const ride = result.rows[0];

  if (!ride) {
    await sendText(driverPhone, "Sorry, this ride has already been accepted by another driver.");
    return;
  }

  await db.query("UPDATE drivers SET status = 'busy' WHERE id = $1", [driver.id]);

  await sendText(
    driverPhone,
    [
      "You accepted this ride ✅",
      "",
      `Rider: ${ride.rider_name}`,
      `Phone: ${ride.rider_phone}`,
      `Pickup: ${ride.pickup_location}`,
      `Drop-off: ${ride.dropoff_location}`,
      `Time: ${ride.pickup_time}`,
      `Passengers: ${ride.passengers}`,
      `Notes: ${ride.notes || "None"}`,
      "",
      "Options:",
      "1. Send ETA",
      "2. I'm outside",
      "3. Ask rider a question"
    ].join("\n")
  );

  await sendButtons(
    ride.rider_phone,
    [
      "Your ride has been accepted ✅",
      "",
      `Driver: ${driver.name}`,
      `Vehicle: ${driver.vehicle || ""}`,
      `Plate: ${driver.plate || ""}`,
      "",
      "What would you like to do?"
    ].join("\n"),
    [
      { id: `REQ_ETA_${ride.id}`, title: "Request ETA" },
      { id: `ASK_DRIVER_${ride.id}`, title: "Ask driver" },
      { id: `CANCEL_${ride.id}`, title: "Cancel" }
    ]
  );
}

async function requestEta(rideId) {
  const ride = await getRide(rideId);
  if (!ride?.assigned_driver_id) return;

  const driverResult = await db.query("SELECT * FROM drivers WHERE id = $1", [ride.assigned_driver_id]);
  const driver = driverResult.rows[0];

  await setState(driver.phone, "driver", "awaiting_eta", ride.id);
  await sendText(driver.phone, "The rider is asking for your ETA. Reply with the number of minutes away, for example: 7");
}

async function sendEta(driverPhone, etaText, rideId) {
  const minutes = parseInt(etaText, 10);
  if (Number.isNaN(minutes)) {
    await sendText(driverPhone, "Please reply with a number only, for example: 7");
    return;
  }

  const ride = await getRide(rideId);
  await db.query(
    "UPDATE rides SET eta_minutes = $1, status = 'driver_en_route', updated_at = NOW() WHERE id = $2",
    [minutes, rideId]
  );

  await sendText(ride.rider_phone, `Your driver says they are about ${minutes} minutes away.`);
  await sendText(driverPhone, "ETA sent to rider ✅");
  await setState(driverPhone, "driver", "idle", rideId);
}

async function driverOutside(driverPhone, rideId) {
  const ride = await getRide(rideId);
  await db.query(
    "UPDATE rides SET status = 'driver_outside', updated_at = NOW() WHERE id = $1",
    [rideId]
  );

  await sendText(ride.rider_phone, "Your driver is outside 🚗");
  await sendText(driverPhone, "Rider has been notified ✅");
}

async function askQuestion(senderPhone, senderRole, rideId, question) {
  const ride = await getRide(rideId);

  await db.query(
    "INSERT INTO ride_messages (ride_id, sender_phone, sender_role, message) VALUES ($1, $2, $3, $4)",
    [rideId, senderPhone, senderRole, question]
  );

  if (senderRole === "driver") {
    await sendText(ride.rider_phone, `Message from your driver:\n\n"${question}"\n\nReply here and I will send it to the driver.`);
    await setState(ride.rider_phone, "rider", "replying_to_driver", rideId);
  } else {
    const driverResult = await db.query("SELECT * FROM drivers WHERE id = $1", [ride.assigned_driver_id]);
    const driver = driverResult.rows[0];
    await sendText(driver.phone, `Message from rider:\n\n"${question}"`);
    await setState(driver.phone, "driver", "idle", rideId);
  }
}

module.exports = {
  getState,
  setState,
  createDraftRide,
  updateRideField,
  getRide,
  formatRideSummary,
  confirmRide,
  acceptRide,
  requestEta,
  sendEta,
  driverOutside,
  askQuestion
};
