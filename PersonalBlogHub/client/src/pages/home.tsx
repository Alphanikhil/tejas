import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Post } from '@shared/schema';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Loader2 } from 'lucide-react';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: ['/api/posts'],
  });

  return (
    <div className="bg-gradient-to-b from-white to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600">
            Tejash's Blog
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sharing insights, experiences, and knowledge. Explore the latest posts below.
          </p>
        </div>

        {/* Admin Panel */}
        {isAuthenticated && (
          <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Admin Dashboard</h2>
            <Link href="/admin/create-post">
              <Button className="mb-2 inline-flex items-center">
                <Plus className="mr-2 h-4 w-4" /> Create New Post
              </Button>
            </Link>
          </div>
        )}

        {/* Posts Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-2">Latest Posts</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">Error loading posts. Please try again later.</p>
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all duration-200 border border-transparent hover:border-blue-100">
                  <h3 className="text-xl font-semibold mb-2 text-gray-800 hover:text-primary">
                    <Link href={`/post/${post.slug}`}>{post.title}</Link>
                  </h3>
                  <p className="text-gray-600 mb-3">{post.excerpt}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <Link 
                      href={`/post/${post.slug}`} 
                      className="text-primary hover:text-primary/80 font-medium flex items-center group"
                    >
                      Read more 
                      <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts found.</p>
              {isAuthenticated && (
                <Link href="/admin/create-post">
                  <Button className="mt-4">
                    Create your first post <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
