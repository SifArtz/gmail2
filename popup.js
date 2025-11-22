document.getElementById('sendEmails').addEventListener('click', () => {
  const input = document.getElementById('adList').value.trim();

  console.log('Step 1: Input received:', input);

  if (!input) {
    console.error('Step 1 Failed: Input is empty.');
    alert('Please paste your ad list.');
    return;
  }

  // Parse the ad list - Поддержка нового формата
  const ads = [];
  const adBlocks = input.split('\n\n').filter(block => block.trim() !== '');

  adBlocks.forEach((block, idx) => {
    const lines = block.split('\n').filter(line => line.trim() !== '');
    let email = null;
    let title = null;

    // Новый формат с эмодзи
    const emailLine = lines.find(line => line.includes('📧 Email:'));
    const titleLine = lines.find(line => line.includes('🔍 Title:'));

    if (emailLine && titleLine) {
      email = emailLine.split('📧 Email:')[1].trim();
      title = titleLine.split('🔍 Title:')[1].trim();
    } 
    // Старый формат (fallback)
    else {
      const oldEmailLine = lines.find(line => line.includes('├ Почта:') || line.includes('├ Email:'));
      const oldTitleLine = lines.find(line => line.includes('├ Товар:') || line.includes('├ Product:'));
      
      if (oldEmailLine && oldTitleLine) {
        email = oldEmailLine.split(':')[1].trim();
        title = oldTitleLine.split(':')[1].trim();
      }
    }

    if (email && title) {
      ads.push({ title, email });
      console.log(`Block ${idx + 1} parsed:`, { title, email });
    } else {
      console.warn(`Block ${idx + 1} ignored. Invalid format:`, block);
    }
  });

  if (ads.length === 0) {
    console.error('Step 2 Failed: No valid ads found.');
    alert('No valid ads found. Please check your input format.');
    return;
  }

  console.log('Step 2: Data parsed successfully:', ads);

  fetch(chrome.runtime.getURL('messages.json'))
    .then(response => response.json())
    .then(messages => {
      console.log('Step 3: Messages loaded:', messages);
      if (!messages || !messages.length) {
        console.error('Step 3 Failed: No messages found.');
        alert('Failed to load message templates.');
        return;
      }

      let index = 0;
      const counterElement = document.getElementById('emailCounter');
      counterElement.textContent = `Emails sent: 0 / ${ads.length}`;

      function sendNextEmail() {
        if (index >= ads.length) {
          console.log('Step 15: All emails sent.');
          alert('All emails sent successfully.');
          return;
        }

        const { title, email } = ads[index];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];

        console.log('Step 4: Processing item:', { index, title, email });
        console.log('Step 4.1: Message to be sent:', randomMessage);

        chrome.tabs.query({ url: 'https://mail.google.com/*' }, (tabs) => {
          if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { active: true }, (tab) => {
              console.log('Step 5: Executing script on existing tab:', tab.id);
              executeEmailScript(tab.id, title, email, randomMessage);
            });
          } else {
            chrome.tabs.create({ url: 'https://mail.google.com/mail/u/0/#inbox' }, (tab) => {
              chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(listener);
                  console.log('Step 5: Executing script on new tab:', tabId);
                  setTimeout(() => executeEmailScript(tabId, title, email, randomMessage), 2000);
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
    })
    .catch(error => {
      console.error('Step 3 Failed: Error loading messages.json:', error);
      alert('Error loading message templates.');
    });
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
    const bodyField = document.querySelector('div[role="textbox"][aria-label="Message Body"][contenteditable="true"]') ||
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