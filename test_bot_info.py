import unittest
from unittest.mock import patch, MagicMock
from importlib import import_module
import requests

# Import the module to be tested
bot_info = import_module("Bot-info")

class TestBotInfo(unittest.TestCase):
    @patch('requests.get')
    def test_get_bot_info_timeout(self, mock_get):
        # Mock the response
        mock_response = unittest.mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_get.return_value = mock_response

        # Call the function
        bot_info.get_bot_info()

        # Check if timeout was passed
        args, kwargs = mock_get.call_args
        self.assertIn('timeout', kwargs, "Timeout argument is missing in requests.get call!")
        self.assertEqual(kwargs['timeout'], 10, "Timeout should be set to 10 seconds.")

    @patch('requests.get')
    def test_get_guilds_timeout(self, mock_get):
        # Mock the response
        mock_response = unittest.mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        # Call the function
        bot_info.get_guilds()

        # Check if timeout was passed
        args, kwargs = mock_get.call_args
        self.assertIn('timeout', kwargs, "Timeout argument is missing in requests.get call!")
        self.assertEqual(kwargs['timeout'], 10, "Timeout should be set to 10 seconds.")

    @patch('requests.get')
    def test_get_application_info_timeout(self, mock_get):
        # Mock the response
        mock_response = unittest.mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_get.return_value = mock_response

        # Call the function
        bot_info.get_application_info()

        # Check if timeout was passed
        args, kwargs = mock_get.call_args
        self.assertIn('timeout', kwargs, "Timeout argument is missing in requests.get call!")
        self.assertEqual(kwargs['timeout'], 10, "Timeout should be set to 10 seconds.")

    @patch('builtins.print')
    @patch('requests.get')
    def test_timeout_exception_handling(self, mock_get, mock_print):
        # Mock requests.get to raise Timeout exception
        mock_get.side_effect = requests.Timeout("Connection timed out")

        # Call the function
        result = bot_info.get_bot_info()

        # Check if function returns None (graceful failure)
        self.assertIsNone(result, "Function should return None on timeout exception.")

        # Check if error message was printed
        mock_print.assert_called()
        args, _ = mock_print.call_args
        self.assertIn("Connection timed out", args[0], "Error message should contain exception details.")

if __name__ == '__main__':
    unittest.main()
