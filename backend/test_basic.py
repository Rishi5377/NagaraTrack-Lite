"""
Simple test script to verify basic functionality
"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

def test_imports():
    """Test that all main modules can be imported"""
    try:
        import main
        print("✅ Main module imports successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import main module: {e}")
        return False

def test_app_creation():
    """Test that FastAPI app can be created"""
    try:
        from main import app
        print("✅ FastAPI app created successfully")
        print(f"   App routes: {len(app.routes)} routes found")
        return True
    except Exception as e:
        print(f"❌ Failed to create FastAPI app: {e}")
        return False

def main():
    """Run all basic tests"""
    print("🚀 Running basic backend tests...")
    
    tests = [
        test_imports,
        test_app_creation,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
        sys.exit(0)
    else:
        print("💥 Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()