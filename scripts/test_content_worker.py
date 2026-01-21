import sys
import os
import unittest
from unittest.mock import MagicMock, patch, AsyncMock, ANY, call

# 1. Mock environment variables required by content_worker to avoid import errors
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "mock-key"

# 2. Patch dependencies that run at module level to prevent side effects during import
# We mock argparse to prevent it from trying to parse sys.argv of the test runner
# We mock create_client to prevent real network connections on import
with patch("argparse.ArgumentParser.parse_args") as mock_parse_args, \
     patch("supabase.create_client"):
    
    # Setup default mock args structure
    mock_args = MagicMock()
    mock_args.topic = None
    mock_args.force_images = False
    mock_args.force_audio = False
    mock_args.check = False
    mock_args.force_quotes = False
    mock_args.concurrency = 0
    mock_parse_args.return_value = mock_args

    # Import the module under test
    # This must happen inside the patch context
    import content_worker

class TestContentWorker(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        # Reset global args before each test to ensure isolation
        content_worker.args.force_audio = False
        content_worker.args.force_images = False
        content_worker.args.force_quotes = False

    async def test_generate_content_success(self):
        """Test successful content generation where all handlers return data"""
        row = {
            'word_kr': '테스트',
            'translation': 'test',
            'example_kr': '이것은 테스트입니다.'
        }
        session = MagicMock()
        
        # Mock the individual handlers
        with patch('content_worker.handle_main_audio', new_callable=AsyncMock) as m_main, \
             patch('content_worker.handle_male_audio', new_callable=AsyncMock) as m_male, \
             patch('content_worker.handle_example_audio', new_callable=AsyncMock) as m_ex, \
             patch('content_worker.handle_image', new_callable=AsyncMock) as m_img:
            
            # Setup return values for each handler
            m_main.return_value = {'audio_url': 'http://bucket/audio_female.mp3'}
            m_male.return_value = {'audio_male': 'http://bucket/audio_male.mp3'}
            m_ex.return_value = {'example_audio': 'http://bucket/ex.mp3'}
            m_img.return_value = {'image': 'http://bucket/img.jpg', 'image_source': 'pixabay'}

            # Run the function
            updates = await content_worker._generate_content_for_word(session, row)

            # Verify the aggregated result
            expected_updates = {
                'audio_url': 'http://bucket/audio_female.mp3',
                'audio_male': 'http://bucket/audio_male.mp3',
                'example_audio': 'http://bucket/ex.mp3',
                'image': 'http://bucket/img.jpg',
                'image_source': 'pixabay'
            }
            self.assertEqual(updates, expected_updates)
            
            # Verify handlers were called with correct arguments
            m_main.assert_called_with(session, row, '테스트', ANY, force_audio=False)
            m_male.assert_called_with(row, '테스트', ANY, force_audio=False)
            m_ex.assert_called_with(row, '이것은 테스트입니다.', force_audio=False)
            m_img.assert_called_with(session, row, 'test', ANY, force_images=False)

    async def test_generate_content_partial(self):
        """Test scenario where some handlers return empty dicts (no updates needed)"""
        row = {'word_kr': 'test', 'translation': None, 'example_kr': None}
        session = MagicMock()
        
        with patch('content_worker.handle_main_audio', new_callable=AsyncMock) as m_main, \
             patch('content_worker.handle_male_audio', new_callable=AsyncMock) as m_male, \
             patch('content_worker.handle_example_audio', new_callable=AsyncMock) as m_ex, \
             patch('content_worker.handle_image', new_callable=AsyncMock) as m_img:
            
            # Only main audio returns an update
            m_main.return_value = {'audio_url': 'http://bucket/audio.mp3'}
            m_male.return_value = {} 
            m_ex.return_value = {}
            m_img.return_value = {}

            updates = await content_worker._generate_content_for_word(session, row)

            # Result should only contain the one update
            self.assertEqual(updates, {'audio_url': 'http://bucket/audio.mp3'})
            self.assertNotIn('audio_male', updates)

    async def test_force_flags_propagation(self):
        """Test that force_audio and force_images flags are correctly passed to handlers"""
        row = {'word_kr': 'test', 'translation': 'test', 'example_kr': 'example'}
        session = MagicMock()
        
        # Enable force flags in the global args
        content_worker.args.force_audio = True
        content_worker.args.force_images = True
        
        with patch('content_worker.handle_main_audio', new_callable=AsyncMock, return_value={}) as m_main, \
             patch('content_worker.handle_male_audio', new_callable=AsyncMock, return_value={}) as m_male, \
             patch('content_worker.handle_example_audio', new_callable=AsyncMock, return_value={}) as m_ex, \
             patch('content_worker.handle_image', new_callable=AsyncMock, return_value={}) as m_img:

            await content_worker._generate_content_for_word(session, row)

            # Check if handlers were called with force=True
            m_main.assert_called_with(ANY, ANY, ANY, ANY, force_audio=True)
            m_male.assert_called_with(ANY, ANY, ANY, force_audio=True)
            m_ex.assert_called_with(ANY, ANY, force_audio=True)
            m_img.assert_called_with(ANY, ANY, ANY, ANY, force_images=True)

    def test_check_integrity(self):
        """Test integrity check logic: fixing DB links and removing orphan files"""
        # 1. Setup mock for storage list (files in bucket)
        # We expect a list of file objects. The script handles objects or dicts.
        file1 = MagicMock(); file1.name = 'valid.mp3'; file1.metadata = {'size': 1000}
        file2 = MagicMock(); file2.name = 'orphan.mp3'; file2.metadata = {'size': 1000}
        file3 = MagicMock(); file3.name = 'small.mp3'; file3.metadata = {'size': 10} # Too small
        
        mock_storage_client = MagicMock()
        # list() returns files first call, then empty list to stop pagination
        mock_storage_client.list.side_effect = [[file1, file2, file3], []]
        
        # Patch the global supabase client in content_worker for this test
        with patch('content_worker.supabase') as mock_supabase:
            mock_supabase: MagicMock
            # Attach storage mock to global supabase client
            mock_supabase.storage.from_.return_value = mock_storage_client
            
            # 2. Setup mock for DB records
            # Record 1 links to valid.mp3 (should be kept)
            # Record 2 links to small.mp3 (should be reset because file is too small)
            # Record 3 links to missing.mp3 (should be reset because file is missing)
            rows = [
                {'id': 1, 'audio_url': 'http://bucket/valid.mp3'},
                {'id': 2, 'audio_url': 'http://bucket/small.mp3'},
                {'id': 3, 'audio_url': 'http://bucket/missing.mp3'}
            ]
            
            # Настройка цепочки моков для: supabase.table().select().range().execute()
            mock_select_builder = MagicMock()
            mock_range_builder = MagicMock()
            
            # Настраиваем возврат данных: первый вызов возвращает rows, второй - пустой список (конец пагинации)
            mock_res_1 = MagicMock(); mock_res_1.data = rows
            mock_res_2 = MagicMock(); mock_res_2.data = []
            mock_range_builder.execute.side_effect = [mock_res_1, mock_res_2]

            mock_supabase.table.return_value.select.return_value = mock_select_builder
            mock_select_builder.range.return_value = mock_range_builder 

            # 3. Run check for 'audio-files' bucket
            content_worker.check_integrity('audio-files')

            # 4. Verify DB updates (fixing broken links)
            # We expect updates for id=2 and id=3
            self.assertEqual(mock_supabase.table.return_value.update.call_count, 2)

            # Проверяем, что update().eq() вызывается с правильными аргументами.
            # Поскольку порядок итерации по словарю не гарантирован,
            # используем assert_has_calls для проверки вызовов без учета порядка.
            update_mock = mock_supabase.table.return_value.update
            eq_mock = update_mock.return_value.eq

            # Проверяем, что для id=2 и id=3 были вызваны update с None
            update_mock.assert_has_calls([
                call({'audio_url': None}),
                call({'audio_url': None})
            ])
            # Проверяем, что для id=2 и id=3 были вызваны eq
            eq_mock.assert_has_calls([call('id', 2), call('id', 3)], any_order=True)
            
            # 5. Verify storage removals (orphans)
            # 'orphan.mp3' is not in DB. 'small.mp3' is in DB but invalid size, so it's treated as orphan too.
            # 'valid.mp3' should NOT be removed.
            mock_storage_client.remove.assert_called_once()
            removed_files = mock_storage_client.remove.call_args[0][0]
            self.assertEqual(set(removed_files), {'orphan.mp3', 'small.mp3'})

    async def test_handle_image_force_logic(self):
        """Test handle_image logic regarding force_images flag and existing images"""
        session = MagicMock()
        
        # Mock responses
        mock_pixabay_resp = AsyncMock()
        mock_pixabay_resp.status = 200
        mock_pixabay_resp.json.return_value = {'hits': [{'webformatURL': 'http://pixabay.com/img.jpg'}]}
        
        mock_img_resp = AsyncMock()
        mock_img_resp.status = 200
        mock_img_resp.read.return_value = b'x' * 600 # > MIN_FILE_SIZE (500)

        # Helper to create async context manager mock for session.get()
        def async_cm(result):
            m = MagicMock()
            m.__aenter__ = AsyncMock(return_value=result)
            m.__aexit__ = AsyncMock(return_value=None)
            return m

        # We expect calls only for scenarios that proceed to download (Scenario 3 and 4)
        # Each successful download involves 2 calls: 1 to API, 1 to Image URL
        session.get.side_effect = [
            async_cm(mock_pixabay_resp), # Scenario 3 (API)
            async_cm(mock_img_resp),     # Scenario 3 (Image)
            async_cm(mock_pixabay_resp), # Scenario 4 (API)
            async_cm(mock_img_resp)      # Scenario 4 (Image)
        ]

        with patch('content_worker.optimize_image_data', return_value=b'x'*600) as mock_opt, \
             patch('content_worker.upload_to_supabase', new_callable=AsyncMock) as mock_upload, \
             patch('content_worker.supabase') as mock_supabase, \
             patch('content_worker.PIXABAY_API_KEY', 'mock-key'):
            
            mock_supabase.storage.from_.return_value.get_public_url.return_value = 'http://supabase/new_image.jpg'

            # Scenario 1: Existing custom image (not pixabay). Should skip regardless of force.
            row_custom = {'image': 'http://old.jpg', 'image_source': 'user', 'word_kr': 'test'}
            res1 = await content_worker.handle_image(session, row_custom, 'test', 'hash', force_images=True)
            self.assertEqual(res1, {})
            
            # Scenario 2: Existing pixabay image, force=False. Should skip.
            row_pixabay = {'image': 'http://old_pix.jpg', 'image_source': 'pixabay', 'word_kr': 'test'}
            res2 = await content_worker.handle_image(session, row_pixabay, 'test', 'hash', force_images=False)
            self.assertEqual(res2, {})

            # Scenario 3: Existing pixabay image, force=True. Should update.
            res3 = await content_worker.handle_image(session, row_pixabay, 'test', 'hash', force_images=True)
            self.assertEqual(res3, {'image': 'http://supabase/new_image.jpg', 'image_source': 'pixabay'})
            
            # Scenario 4: No image. Should update regardless of force (testing force=False here).
            row_none = {'image': None, 'image_source': None, 'word_kr': 'test'}
            res4 = await content_worker.handle_image(session, row_none, 'test', 'hash', force_images=False)
            self.assertEqual(res4, {'image': 'http://supabase/new_image.jpg', 'image_source': 'pixabay'})

if __name__ == '__main__':
    unittest.main()
