import sys
import os
import unittest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock

# 1. Mock environment variables required by content_worker to avoid import errors
os.environ["SUPABASE_URL"] = "https://mock.supabase.co"
os.environ["SUPABASE_SERVICE_KEY"] = "mock-key"

# 2. Patch dependencies that run at module level to prevent side effects during import
# We mock argparse to prevent it from trying to parse sys.argv of the test runner
# We mock create_client to prevent real network connections on import
with patch("argparse.ArgumentParser.parse_args") as mock_parse_args, \
     patch("supabase.create_client") as mock_create_client:
    
    # Setup default mock args structure
    mock_args = MagicMock()
    mock_args.topic = None
    mock_args.force_images = False
    mock_args.force_audio = False
    mock_args.check = False
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
            # handle_image(session, row, translation, word_hash, force_images)
            m_img.assert_called_once()
            args = m_img.call_args[0]
            self.assertEqual(args[0], session)
            self.assertEqual(args[1], row)
            self.assertEqual(args[2], 'test') # translation
            self.assertFalse(args[4]) # force_images (default False)

    async def test_generate_content_partial(self):
        """Test scenario where some handlers return empty dicts (no updates needed)"""
        row = {'word_kr': 'test'}
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
        row = {'word_kr': 'test'}
        session = MagicMock()
        
        # Enable force flags in the global args
        content_worker.args.force_audio = True
        content_worker.args.force_images = True
        
        with patch('content_worker.handle_main_audio', new_callable=AsyncMock) as m_main, \
             patch('content_worker.handle_male_audio', new_callable=AsyncMock) as m_male, \
             patch('content_worker.handle_example_audio', new_callable=AsyncMock) as m_ex, \
             patch('content_worker.handle_image', new_callable=AsyncMock) as m_img:
            
            # Return empty to just check calls
            m_main.return_value = {}
            m_male.return_value = {}
            m_ex.return_value = {}
            m_img.return_value = {}

            await content_worker._generate_content_for_word(session, row)

            # Check if force_audio=True was passed (it's the 5th argument for audio handlers)
            self.assertTrue(m_main.call_args[0][4])
            self.assertTrue(m_male.call_args[0][3]) # handle_male_audio has 4 args, force is at index 3
            
            # Check if force_images=True was passed (it's the 5th argument for image handler)
            self.assertTrue(m_img.call_args[0][4])

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
            
            mock_db_query = MagicMock()
            mock_db_query.execute.return_value.data = rows
            mock_supabase.table.return_value.select.return_value = mock_db_query

            # 3. Run check for 'audio-files' bucket
            content_worker.check_integrity('audio-files')

            # 4. Verify DB updates (fixing broken links)
            # We expect updates for id=2 and id=3
            self.assertEqual(mock_supabase.table.return_value.update.call_count, 2)
            
            # 5. Verify storage removals (orphans)
            # 'orphan.mp3' is not in DB. 'small.mp3' is in DB but invalid size, so it's treated as orphan too.
            # 'valid.mp3' should NOT be removed.
            mock_storage_client.remove.assert_called()
            removed_files = mock_storage_client.remove.call_args[0][0]
            self.assertIn('orphan.mp3', removed_files)
            self.assertIn('small.mp3', removed_files)
            self.assertNotIn('valid.mp3', removed_files)

if __name__ == '__main__':
    unittest.main()
