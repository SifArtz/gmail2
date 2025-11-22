const adListElement = document.getElementById('adList');
const counterElement = document.getElementById('emailCounter');
const pasteListElement = document.getElementById('pasteList');
const sendButton = document.getElementById('sendEmails');

function parseAds(rawInput) {
  const lines = rawInput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return lines
    .map((line, idx) => {
      // Новый формат: email | title | adlink (используем только первые два поля)
      const parts = line.split('|').map(part => part.trim()).filter(Boolean);

      if (parts.length >= 2) {
        const [email, title] = parts;
        if (email && title) {
          console.log(`Line ${idx + 1} parsed (pipe format):`, { email, title });
          return { email, title };
        }
      }

      // Fallback на старые блоки с эмодзи или символами таблицы
      const blockLines = line.split('\n').filter(Boolean);
      const emailLine = blockLines.find(entry => entry.includes('📧 Email:') || entry.includes('├ Почта:') || entry.includes('├ Email:'));
      const titleLine = blockLines.find(entry => entry.includes('🔍 Title:') || entry.includes('├ Товар:') || entry.includes('├ Product:'));

      if (emailLine && titleLine) {
        const emailValue = emailLine.split(':')[1]?.trim();
        const titleValue = titleLine.split(':')[1]?.trim();
        if (emailValue && titleValue) {
          console.log(`Line ${idx + 1} parsed (fallback format):`, { email: emailValue, title: titleValue });
          return { email: emailValue, title: titleValue };
        }
      }

      console.warn(`Line ${idx + 1} ignored. Invalid format:`, line);
      return null;
    })
    .filter(Boolean);
}

function parsePastes(rawInput) {
  return rawInput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

sendButton.addEventListener('click', () => {
  const adInput = adListElement.value.trim();
  const pasteInput = pasteListElement.value.trim();

  console.log('Step 1: Inputs received:', { adInput, pasteInput });

  if (!adInput) {
    console.error('Step 1 Failed: Input is empty.');
    alert('Please paste your ad list.');
    return;
  }

  if (!pasteInput) {
    console.error('Step 1 Failed: Paste list is empty.');
    alert('Please paste your message list.');
    return;
  }

  const ads = parseAds(adInput);
  const pastes = parsePastes(pasteInput);

  if (ads.length === 0) {
    console.error('Step 2 Failed: No valid ads found.');
    alert('No valid ads found. Please check your input format.');
    return;
  }

  if (pastes.length < ads.length) {
    console.error('Step 2 Failed: Not enough pastes for all emails.', { pastes: pastes.length, ads: ads.length });
    alert('Not enough pastes for all emails. Please add more messages.');
    return;
  }

  console.log('Step 2: Data parsed successfully:', { ads, pastes });

  let index = 0;
  counterElement.textContent = `Emails sent: 0 / ${ads.length}`;

  function sendNextEmail() {
    if (index >= ads.length) {
      console.log('Step 15: All emails sent.');
      alert('All emails sent successfully.');
      return;
    }

    const { title, email } = ads[index];
    const message = pastes[index];

    console.log('Step 4: Processing item:', { index, title, email });
    console.log('Step 4.1: Message to be sent:', message);

    chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true }, (tab) => {
          console.log('Step 5: Executing script on existing tab:', tab.id);
          executeEmailScript(tab.id, title, email, message);
        });
      } else {
        chrome.tabs.create({ url: 'https://mail.google.com/mail/u/0/#inbox' }, (tab) => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              console.log('Step 5: Executing script on new tab:', tabId);
              setTimeout(() => executeEmailScript(tabId, title, email, message), 2000);
            }
          });
        });
      }
    });

    function executeEmailScript(tabId, title, email, message) {
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: automateEmail,
        args: [title, email, message]
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Step 5.1: Script execution failed:', chrome.runtime.lastError.message);
          alert('Failed to send email. Please refresh Gmail and try again.');
        } else {
          console.log('Step 5.1: Script executed successfully:', results);
          index++;
          counterElement.textContent = `Emails sent: ${index} / ${ads.length}`;
          const delay = 5000 + Math.random() * 5000;
          console.log(`Step 6: Waiting ${delay / 1000} seconds before next email...`);
          setTimeout(sendNextEmail, delay);
        }
      });
    }
  }

  sendNextEmail();
});

function automateEmail(title, email, message) {
  console.log('Step 7: Starting email automation with:', { title, email, message });

  const composeButton = document.querySelector('div.T-I.T-I-KE.L3[role="button"]');
  if (!composeButton) {
    console.error('Step 7 Failed: Compose button not found.');
    throw new Error('Compose button not found.');
  }

  console.log('Step 8: Compose button found, clicking...');
  composeButton.click();

  let attempts = 0;
  const maxAttempts = 30;

  const waitForForm = setInterval(() => {
    attempts++;
    console.log(`Step 9: Attempt ${attempts} to find form elements...`);

    const formContainer = document.querySelector('div.AD');
    if (!formContainer) {
      if (attempts >= maxAttempts) {
        clearInterval(waitForForm);
        console.error('Step 9 Failed: Compose form did not load within 15 seconds.');
        throw new Error('Compose form did not load within 15 seconds.');
      }
      return;
    }
    console.log('Step 10: Form container found:', formContainer);

    const toField = formContainer.querySelector('input[role="combobox"]');
    const subjectField = formContainer.querySelector('input[name="subjectbox"]');
    const bodyField =
      document.querySelector('div[role="textbox"][aria-label="Message Body"][contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"]');
    const sendButton = document.querySelector('div.T-I.J-J5-Ji.aoO.v7[role="button"][aria-label="Send"]') ||
                      document.querySelector('div.T-I.J-J5-Ji.aoO.v7[role="button"][data-tooltip*="Send"]');

    console.log('Step 11: Form elements found:', { toField, subjectField, bodyField, sendButton });

    if (toField && subjectField && bodyField && sendButton) {
      clearInterval(waitForForm);

      console.log('Step 12: Filling "To" field with:', email);
      toField.focus();
      toField.value = email;
      toField.dispatchEvent(new Event('input', { bubbles: true }));
      toField.dispatchEvent(new Event('change', { bubbles: true }));
      toField.blur();

      console.log('Step 13: Filling "Subject" field with:', title);
      subjectField.focus();
      subjectField.value = title;
      subjectField.dispatchEvent(new Event('input', { bubbles: true }));
      subjectField.dispatchEvent(new Event('change', { bubbles: true }));
      subjectField.blur();

      console.log('Step 14: Filling body with:', message);
      bodyField.focus();
      bodyField.textContent = message;
      bodyField.dispatchEvent(new Event('input', { bubbles: true }));
      bodyField.blur();

      console.log('Step 15: Clicking Send button...');
      sendButton.click();
      console.log('Step 16: Email sent for:', { title, email });
    } else {
      if (attempts >= maxAttempts) {
        clearInterval(waitForForm);
        console.error('Step 11 Failed: Form fields or Send button not found after 15 seconds:', { toField, subjectField, bodyField, sendButton });
        throw new Error('Form fields or Send button not found after 15 seconds.');
      }
    }
  }, 500);
}