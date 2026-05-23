/*
 * LEGIBILITY DEMO — toggle between chaotic and structured states.
 *
 * Loaded on agent.html only. Wires the MAKE IT LEGIBLE / RESET
 * SIGNAL buttons to a single class on the demo container.
 *
 * To change the chaos fragments or the structured signals, edit
 * the markup directly inside agent.html — no JS changes needed.
 */

(function () {
  if (document.body.dataset.page !== "agent") return;

  const demo = document.querySelector(".legibility-demo");
  if (!demo) return;

  const makeBtn = demo.querySelector(".legibility-demo__make");
  const resetBtn = demo.querySelector(".legibility-demo__reset");
  if (!makeBtn || !resetBtn) return;

  function setLegible(on) {
    demo.classList.toggle("is-legible", on);
    makeBtn.hidden = on;
    resetBtn.hidden = !on;
    // Move focus to the now-visible button for keyboard users
    if (on) {
      resetBtn.focus();
    } else {
      makeBtn.focus();
    }
  }

  makeBtn.addEventListener("click", function () { setLegible(true); });
  resetBtn.addEventListener("click", function () { setLegible(false); });
})();
