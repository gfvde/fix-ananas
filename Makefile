.PHONY: default package build clean
default: package

# Clean, push-ready theme: build/theme/ (push from there) + build/ananas-theme-<date>.zip
package:
	./scripts/package.sh

# Kept for muscle memory: same as `make package`
build: package

clean:
	rm -rf build/theme build/*.zip
