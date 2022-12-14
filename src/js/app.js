// Environment variables
const NODE_ENV = process.env.NODE_ENV;
const GA = process.env.GA;

import googleAnalytics from "./vendor/google-analytics";
import {
  addDays,
  addHours,
  endOfDay,
  format,
  isAfter,
  isBefore,
  startOfDay,
} from "date-fns";

const language = location.pathname.indexOf("/nl") > -1 ? "nl" : "en";

const utcOffset = 1; // Netherlands is GMT+1 (+2 in summer)
const date = new Date(); // Now on this device
const utc = date.getTime() + date.getTimezoneOffset() * 60000;
const now = new Date(utc + 3600000 * utcOffset); // Now in the Netherlands

let carousel;
let photos;
let currentPhoto = 0;
let showingNav = false;

function onPageLoad() {
  sendPageViewToGA();
  checkForCalendarEvents();
  bindMobileNavEvents();
  bindCarouselEvents();
  setupContactForm();
  setupRegistrationForm();
  setupCheckBox();
}

// Fire page view to Google Analytics
// Only fire if ga is present and not removed by privacy guarding browser plugins
// Only continue if a the UA-ID was correctly embedded in this file (sometime fails)
function sendPageViewToGA() {
  googleAnalytics;
  if (ga && GA) {
    ga("create", GA, "auto");
    ga("set", { dimension1: NODE_ENV });
    ga("send", "pageview");
  }
}

// https://date-fns.org/
// https://github.com/date-fns/date-fns/issues/556
// https://www.techrepublic.com/article/convert-the-local-time-to-another-time-zone-with-this-javascript/
// https://www.npmjs.com/package/time
function checkForCalendarEvents() {
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "https://www.googleapis.com/calendar/v3/calendars/vnsb3jtqormqe6b7ri8hf0k4nc@group.calendar.google.com/events?key=AIzaSyDQIL_K-T2_LkG3HekTMjaabuV90sN51P8"
  );
  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      const response = JSON.parse(request.response);
      evaluateEvents(response);
    }
  };
  request.send();
}

function evaluateEvents(response) {
  // Filter calendar events to those events that are occuring now
  const eventsRightNow = response.items.filter((item) => {
    const startTime = item.start.date
      ? startOfDay(item.start.date)
      : item.start.dateTime;
    const endTime = item.end.date ? endOfDay(item.end.date) : item.end.dateTime;
    const isToday = !isBefore(now, startTime) && !isAfter(now, endTime);
    return isToday;
  });

  // Continue only if there is an event occuring right now (in the Netherlands)
  if (eventsRightNow.length) {
    const firstEvent = eventsRightNow[0];
    const dismissed = JSON.parse(sessionStorage.getItem("dismissed")) || [];
    const wasDismissed = dismissed.some((event) => event === firstEvent.id);
    if (wasDismissed) {
      return;
    }
    showCalendarMessage(firstEvent);
  }
}

function showCalendarMessage(event) {
  const element = document.createElement("div");
  element.setAttribute("id", "calendar-event");
  const startDate = event.start.date
    ? format(event.start.date, "DD/MM/YYYY")
    : format(addHours(event.start.dateTime, 1), "DD/MM/YYYY, HH:mm");
  const endDate = event.end.date
    ? format(addDays(event.end.date, -1), "DD/MM/YYYY")
    : format(addHours(event.end.dateTime, 1), "DD/MM/YYYY, HH:mm");
  const dates =
    startDate === endDate
      ? `Gedurende ${startDate}`
      : `Van: ${startDate}</br>Tot: ${endDate}`;
  const description = event.description
    ? event.description.replace(/\n\n/g, "<p/><p>").replace(/\n/g, "<br/>")
    : "";
  const buttonLabel =
    language === "nl" ? "Begrepen, sluit venster" : "Understood, close message";
  element.innerHTML = `
    <div>
      <div>
        <h1>${event.summary}</h1>
        <p>${dates}</p>
        <p>${description}</p>
        <button>${buttonLabel}</button>
      </div>
    </div>
  `;
  const closeButton = element.querySelector("button");
  const close = () => {
    element.classList.add("outro");
    let dismissed = JSON.parse(sessionStorage.getItem("dismissed")) || [];
    dismissed.push(event.id);
    sessionStorage.setItem("dismissed", JSON.stringify(dismissed));
    setTimeout(() => {
      element.remove();
    }, 500);
  };
  closeButton.addEventListener("click", close, false);
  document.body.appendChild(element);
}

function bindMobileNavEvents() {
  const btn = document.querySelector(`header button`);
  btn.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      toggleMobileNav();
    },
    false
  );
  document.querySelector("nav").addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      openMobileNav();
    },
    false
  );
  document.body.addEventListener("click", closeMobileNav, false);
}

function toggleMobileNav() {
  if (showingNav) {
    closeMobileNav();
  } else {
    openMobileNav();
  }
}

function openMobileNav() {
  document.body.classList.add("show-mobile-nav");
  showingNav = true;
}

function closeMobileNav() {
  document.body.classList.remove("show-mobile-nav");
  showingNav = false;
}

function bindCarouselEvents() {
  carousel = document.querySelector(`.carousel`);
  // Continue only if this page has a Carousel
  if (!carousel) {
    return;
  }
  photos = document.querySelectorAll(`.carousel img`);
  const btnNext = document.querySelector(`.carousel button.next`);
  const btnPrev = document.querySelector(`.carousel button.prev`);
  btnPrev.addEventListener("click", prevPhoto);
  btnPrev.addEventListener("mouseover", function () {
    carousel.classList.add("prev");
    carousel.classList.remove("next");
  });
  btnNext.addEventListener("click", nextPhoto);
  btnNext.addEventListener("mouseover", function () {
    carousel.classList.add("next");
    carousel.classList.remove("prev");
  });
  carousel.addEventListener("mouseover", () => {
    carousel.classList.add("hover");
  });
  carousel.addEventListener("mouseout", () => {
    carousel.classList.remove("hover");
    carousel.classList.add("next");
    carousel.classList.remove("prev");
  });
  setInterval(() => {
    if (carousel.className.indexOf("hover") < 0) {
      nextPhoto();
    }
  }, 4000);
  photos[currentPhoto].className = "active";
}

function nextPhoto() {
  outroPhoto(currentPhoto, "next");
  currentPhoto = ++currentPhoto;
  currentPhoto = currentPhoto >= photos.length ? 0 : currentPhoto;
  introPhoto(currentPhoto, "next");
}

function prevPhoto() {
  outroPhoto(currentPhoto, "prev");
  currentPhoto = --currentPhoto;
  currentPhoto = currentPhoto < 0 ? photos.length - 1 : currentPhoto;
  introPhoto(currentPhoto, "prev");
}

function introPhoto(i) {
  photos[i].classList.add("active");
}

function outroPhoto(i) {
  photos[i].classList.remove("active");
  photos[i].classList.add("outro");
  setTimeout(() => {
    photos[i].classList.remove("outro");
  }, 900);
}

function setupContactForm() {
  const button = document.querySelector("#contact #form button");
  if (button) {
    button.addEventListener("click", submitContactForm);
  }
}

function setupRegistrationForm() {
  const button = document.querySelector(
    "#registration-form button.green-button"
  );
  if (button) {
    button.addEventListener("click", submitRegistrationForm);
  }
}

let submitting = false;

async function submitContactForm() {
  if (submitting) {
    return;
  }
  const form = document.querySelector("#contact #form");
  const nameInput = document.querySelector("#contact #form input#name");
  const emailInput = document.querySelector("#contact #form input#email");
  const messageInput = document.querySelector("#contact #form textarea");
  const name = nameInput.value;
  const email = emailInput.value;
  const message = messageInput.value;
  console.log("sending...");
  console.log(name);
  console.log(email);
  console.log(message);
  nameInput.disabled = true;
  emailInput.disabled = true;
  messageInput.disabled = true;
  submitting = true;
  form.classList.replace("idle", "sending");
  try {
    const response = await fetch(
      "https://api.huisartspoelstra.nl/submit-contact-form",
      {
        method: "POST",
        body: JSON.stringify({ name, email, message }),
      }
    );
    const content = await response.json();
    if (content.success) {
      form.classList.replace("sending", "success");
    } else {
      form.classList.replace("sending", "fail");
    }
  } catch (e) {
    form.classList.replace("sending", "fail");
  }
}

async function submitRegistrationForm() {
  if (submitting) {
    return;
  }

  const form = document.querySelector("#registration-form");

  const firstNameInput = form.querySelector("input#first-name");
  const lastNameInput = form.querySelector("input#last-name");
  const genderInput = form.querySelector("input#gender");
  const dobInput = form.querySelector("input#dob");
  const addressInput = form.querySelector("textarea#address");
  const emailInput = form.querySelector("input#email");
  const phoneInput = form.querySelector("input#phone");
  const bsnInput = form.querySelector("input#bsn");
  const agreement1 = form.querySelector("#agreement-1");
  const agreement2 = form.querySelector("#agreement-2");
  const firstName = firstNameInput.value;
  const lastName = lastNameInput.value;
  const gender = genderInput.value;
  const dob = dobInput.value;
  const address = addressInput.value;
  const email = emailInput.value;
  const phone = phoneInput.value;
  const bsn = bsnInput.value;
  const agreed1 = agreement1.classList.contains("checked");
  const agreed2 = agreement2.classList.contains("checked");

  const payload = {
    firstName,
    lastName,
    gender,
    dob,
    address,
    email,
    phone,
    bsn,
    agreed1,
    agreed2,
  };

  console.log("sending...");
  console.log(payload);

  firstNameInput.disabled = true;
  lastNameInput.disabled = true;
  genderInput.disabled = true;
  dobInput.disabled = true;
  addressInput.disabled = true;
  emailInput.disabled = true;
  phoneInput.disabled = true;
  bsnInput.disabled = true;
  agreement1.disabled = true;
  agreement2.disabled = true;

  submitting = true;
  form.classList.replace("idle", "sending");
  try {
    const response = await fetch(
      "https://api.huisartspoelstra.nl/submit-registration-form",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    const content = await response.json();
    if (content.success) {
      form.classList.replace("sending", "success");
    } else {
      form.classList.replace("sending", "fail");
    }
  } catch (e) {
    form.classList.replace("sending", "fail");
  }
}

function setupCheckBox() {
  document.querySelectorAll("button.checkbox").forEach((button) => {
    button.onclick = toggleCheckedIcon;
  });
}

function toggleCheckedIcon(event) {
  const button = event.currentTarget;
  const boxIsChecked = button.classList.contains("checked");

  if (boxIsChecked) {
    button.classList.add("unchecked");
    button.classList.remove("checked");
  } else {
    button.classList.remove("unchecked");
    button.classList.add("checked");
  }
}

// Only init() once the DOM is ready for interaction.
// A common mistake is to wait for "complete", but we don't need images and styles to be complete.
const domIsInteractive = ["interactive", "complete"].includes(
  document.readyState
);
if (domIsInteractive) {
  onPageLoad();
} else {
  document.addEventListener("DOMContentLoaded", onPageLoad);
}
