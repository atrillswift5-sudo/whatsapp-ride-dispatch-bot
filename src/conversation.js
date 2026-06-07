const {
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
} = require("./rideService");

const { sendText, sendButtons } = require("./whatsapp");

const bookingSteps = [
  { state: "awaiting_name", field: "rider_name", prompt: "What is your full name?" },
  { state: "awaiting_pickup", field: "pickup_location", prompt: "What is your pickup location?" },
  { state: "awaiting_dropoff", field: "dropoff_location", prompt: "What is your drop-off location?" },
  { state: "awaiting_time", field: "pickup_time", prompt: "What date and time do you need the ride?" },
  { state: "awaiting_passengers", field: "passengers", prompt: "How many passengers?" },
  { state: "awaiting_vehicle", field: "vehicle_type", prompt: "What vehicle type? Standard, SUV, Luxury, or Van?" },
  { state: "awaiting_notes", field: "notes", prompt: "Any special notes? If none, reply NONE." }
];

function getStepByState(state) {
  return bookingSteps.find((step) => step.state === state);
}

function getNextStep(currentState) {
  const index = bookingSteps.findIndex((step) => step.state === currentState);
  return bookingSteps[index + 1];
}

async function startBooking(phone) {
  const ride = await createDraftRide(phone);
  await setState(phone, "rider", "awaiting_name", ride.id);
  await sendText(phone, "Welcome 🚗 I can help you book a ride.");
  await sendText(phone, "What is your full name?");
}

async function handleRiderMessage(phone, text, buttonId) {
  if (buttonId?.startsWith("REQ_ETA_")) {
    const rideId = buttonId.replace("REQ_ETA_", "");
    await requestEta(rideId);
    await sendText(phone, "I asked your driver for their ETA. I will send it here once they reply.");
    return;
  }

  if (buttonId?.startsWith("ASK_DRIVER_")) {
    const rideId = buttonId.replace("ASK_DRIVER_", "");
    await setState(phone, "rider", "asking_driver_question", rideId);
    await sendText(phone, "Type your question for the driver.");
    return;
  }

  const state = await getState(phone);

  if (!state) {
    await startBooking(phone);
    return;
  }

  if (state.state === "awaiting_confirmation") {
    const upper = text.toUpperCase();

    if (upper === "YES") {
      await confirmRide(state.ride_id);
      await sendText(phone, "Thank you. Your ride request has been sent to our drivers. I will notify you once a driver accepts.");
      await setState(phone, "rider", "waiting_for_driver", state.ride_id);
      return;
    }

    if (upper === "EDIT") {
      await sendText(phone, "For now, please restart the booking by sending START. Full edit menu can be added next.");
      return;
    }

    await sendText(phone, "Please reply YES to confirm or EDIT to change.");
    return;
  }

  if (state.state === "asking_driver_question" || state.state === "replying_to_driver") {
    await askQuestion(phone, "rider", state.ride_id, text);
    await sendText(phone, "Message sent ✅");
    await setState(phone, "rider", "waiting_for_driver", state.ride_id);
    return;
  }

  const currentStep = getStepByState(state.state);

  if (currentStep) {
    let value = text;

    if (currentStep.field === "passengers") {
      value = parseInt(text, 10);
      if (Number.isNaN(value)) {
        await sendText(phone, "Please enter a number of passengers, for example: 2");
        return;
      }
    }

    if (currentStep.field === "notes" && text.toUpperCase() === "NONE") {
      value = "";
    }

    const ride = await updateRideField(state.ride_id, currentStep.field, value);
    const nextStep = getNextStep(state.state);

    if (nextStep) {
      await setState(phone, "rider", nextStep.state, state.ride_id);
      await sendText(phone, nextStep.prompt);
      return;
    }

    const finalRide = await getRide(state.ride_id);
    await setState(phone, "rider", "awaiting_confirmation", state.ride_id);
    await sendText(phone, formatRideSummary(finalRide));
    return;
  }

  if (text.toUpperCase() === "START" || text.toUpperCase() === "BOOK") {
    await startBooking(phone);
    return;
  }

  await sendButtons(phone, "What would you like to do?", [
    { id: "BOOK_RIDE", title: "Book ride" }
  ]);
}

async function handleDriverMessage(phone, text, buttonId) {
  if (buttonId?.startsWith("ACCEPT_")) {
    const rideId = buttonId.replace("ACCEPT_", "");
    await acceptRide(rideId, phone);
    return;
  }

  if (buttonId?.startsWith("DECLINE_")) {
    await sendText(phone, "No problem. You declined this ride.");
    return;
  }

  const state = await getState(phone);

  if (state?.state === "awaiting_eta") {
    await sendEta(phone, text, state.ride_id);
    return;
  }

  const lower = text.toLowerCase();

  if (lower === "1" || lower.includes("eta")) {
    if (!state?.ride_id) {
      await sendText(phone, "No active ride found.");
      return;
    }
    await setState(phone, "driver", "awaiting_eta", state.ride_id);
    await sendText(phone, "How many minutes away are you? Reply with a number only.");
    return;
  }

  if (lower === "2" || lower.includes("outside")) {
    if (!state?.ride_id) {
      await sendText(phone, "No active ride found.");
      return;
    }
    await driverOutside(phone, state.ride_id);
    return;
  }

  if (lower === "3" || lower.includes("question")) {
    if (!state?.ride_id) {
      await sendText(phone, "No active ride found.");
      return;
    }
    await setState(phone, "driver", "asking_rider_question", state.ride_id);
    await sendText(phone, "Type your question for the rider.");
    return;
  }

  if (state?.state === "asking_rider_question") {
    await askQuestion(phone, "driver", state.ride_id, text);
    await sendText(phone, "Question sent to rider ✅");
    await setState(phone, "driver", "idle", state.ride_id);
    return;
  }

  await sendText(phone, "Driver options:\n1. Send ETA\n2. I'm outside\n3. Ask rider a question");
}

module.exports = { handleRiderMessage, handleDriverMessage };
