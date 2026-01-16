import { client } from '../core/supabaseClient.js';
import { showToast } from '../utils/utils.js';
import { closeModal } from './ui_modal.js';

export async function submitWordRequest() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById('new-word-input'));
    if (!input) return;
    
    const word = input.value.trim();
    if (!word) {
        showToast('Введите слово');
        return;
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
        showToast('Войдите в профиль, чтобы предлагать слова');
        return;
    }

    const { error } = await client.from('word_requests').insert([{ user_id: user.id, word_kr: word }]);

    if (error) showToast('Ошибка отправки: ' + error.message);
    else {
        showToast('✅ Заявка отправлена! AI обработает её скоро.');
        input.value = '';
        closeModal('add-word-modal');
    }
}